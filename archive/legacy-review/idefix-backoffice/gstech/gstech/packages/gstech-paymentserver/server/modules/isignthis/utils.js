// @flow
const { exec } = require('child_process');
const crypto = require('crypto');
const { map, isArray, isPlainObject, mapKeys, mapValues, camelCase, snakeCase } = require('lodash');
const { getPlayerIdByUsername } = require("gstech-core/modules/helpers");
const { axios } = require('gstech-core/modules/axios');
const config = require('../../../config');

const isxConfig = config.providers.isignthis;

const formatUsername = (username: string): string => {
  const { brandId, playerId } = getPlayerIdByUsername(username);
  return `${brandId}${playerId}`;
}

const mapKeysDeep = (obj: any, fn: () => any): any => {
  if (isArray(obj)) return map(obj, (innerObj) => mapKeysDeep(innerObj, fn));
  if (isPlainObject(obj)) return mapValues(mapKeys(obj, fn), (value) => mapKeysDeep(value, fn));
  return obj;
};
const camelCaseify = (i: { ... }): any => mapKeysDeep(i, (v, k) => camelCase(k));
const snakeCaseify = (i: { ... }): any => mapKeysDeep(i, (v, k) => snakeCase(k));

const isxSign = (base64Hmac: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const { privateKey } = isxConfig;
    exec(
      `./bin/isx-sig-${process.platform} sign "${privateKey}" "${base64Hmac}"`,
      { cwd: `${__dirname}` },
      (error, stdout, stderr) => {
        if (error) reject(error);
        if (stderr) reject(stderr);
        if (stdout) resolve(stdout.toString().trim());
      },
    );
  });

const makeSignature = async (
  hmacSecret: string,
  body: Object,
  keyName: string = 'IN',
): Promise<string> => {
  const ts = `${Date.now()}`;
  const nonceBytes = crypto.randomBytes(8);
  const nonce = Buffer.from(nonceBytes).toString('base64');
  const bodyBytes = Buffer.from(JSON.stringify(body));
  const keyNameBytes = Buffer.from(keyName);

  const data = Buffer.concat([keyNameBytes, nonceBytes, Buffer.from(ts), bodyBytes]);
  const hmac = crypto.createHmac('sha512', hmacSecret);
  hmac.update(data);
  const hmacDigest = hmac.digest('hex');

  const signature = await isxSign(hmacDigest);
  return `v=1; k=${keyName}; n=${nonce}; d=${ts}; s=${signature}`;
};

const isxRequest = async <U: ?{ ... }, T>(
  method: 'GET' | 'POST',
  path: string,
  body: ?U,
): Promise<T> => {
  const { apiUrl, hmacSecret, domain, subdomain } = isxConfig;
  let payload;
  let xContentSignature;
  if (body) {
    payload = snakeCaseify(body);
    xContentSignature = await makeSignature(hmacSecret, payload);
  }
  const { data: response } = await axios.request({
    method,
    url: `${apiUrl}/${path}`,
    headers: {
      Domain: domain,
      Subdomain: subdomain,
      'Content-Type': 'application/json; charset=utf-8',
      ...(payload ? { 'X-Content-Signature': xContentSignature } : {}),
    },
    ...(payload ? { data: payload } : {}),
  });
  const camldResponse = camelCaseify(response);
  return camldResponse;
};

const camelCaseifyMiddleware = (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  req.body = camelCaseify(req.body);
  next();
};

module.exports = {
  formatUsername,
  camelCaseify,
  snakeCaseify,
  camelCaseifyMiddleware,
  isxRequest,
  makeSignature,
};
