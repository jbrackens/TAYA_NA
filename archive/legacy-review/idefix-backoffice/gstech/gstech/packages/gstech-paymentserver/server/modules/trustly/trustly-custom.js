/* @flow */
const crypto = require('crypto');

const config = require('../../../config');

const configuration = config.providers.trustly;

const sign = (data: any | string, key: string) => {
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(data, 'utf8');
  return signer.sign(key, 'base64');
};

const trustlySerializeData = (data: any, method: any, uuid: any): string => {
  // $FlowFixMe[method-unbinding]
  const dataType = Object.prototype.toString.call(data);
  const isObj = dataType === '[object Object]';
  const isArr = dataType === '[object Array]';

  if (isObj || isArr) {
    const keys = Object.keys(data);
    let serializedData = '';
    keys.sort();

    for (let i = 0; i < keys.length; i++) { // eslint-disable-line no-plusplus
      const k = keys[i];
      if (data[k] === undefined) {
        throw new Error(`TrustlyClient: Method=${method} uuid=${uuid} Error serializing data, this field are "undefined". "${k}"`);
      }
      if (data[k] === null || !data[k]) {
        serializedData += k;
      } else {
        serializedData = serializedData
          + (!isArr ? k : '')
          + trustlySerializeData(data[k], method, uuid);
      }
    }
    return serializedData;
  }

  return data.toString();
};

const serialize = (method: any, uuid: any, data: any | { status: any }) =>
  method + uuid + trustlySerializeData(data, method, uuid);

const verify = (data: any | string, signature: any, key: any) => {
  const verifier = crypto.createVerify('RSA-SHA1');
  verifier.update(data, 'utf8');

  return verifier.verify(key, signature, 'base64');
};

const prepareNotificationResponse = (notification: any, status: any) => {
  const req = {
    result: {
      signature: '',
      uuid: notification.params.uuid,
      method: notification.method,
      data: {
        status: status || 'OK',
      },
    },
    version: '1.1',
  };

  req.result.signature = sign(
    serialize(
      notification.method,
      notification.params.uuid,
      req.result.data,
    ),
    configuration.privateKey,
  );

  return req;
};

const createNotificationResponse = async (trusltyClient: any, notification: any, status: any): Promise<
  {
    result: {data: {status: any}, method: any, signature: string, uuid: any},
    version: string,
  },
> => {
  await trusltyClient.ready;

  if (typeof notification === 'string') {
    try {
      notification = JSON.parse(notification); // eslint-disable-line
    } catch (error) {
      throw new Error('Cant parse to JSON the notification.');
    }
  }

  const dataToVerify = serialize(
    notification.method,
    notification.params.uuid,
    notification.params.data,
  );

  const v = verify(
    dataToVerify,
    notification.params.signature,
    trusltyClient.publicKey,
  );

  if (!v) {
    throw new Error('Cant verify the response.');
  }

  return prepareNotificationResponse(notification, status);
};

module.exports = { createNotificationResponse };
