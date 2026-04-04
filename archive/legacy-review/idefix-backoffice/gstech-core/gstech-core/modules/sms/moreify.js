/* @flow */
import type { SMSProviderApi, SMSResult } from '../types/config';

const request = require('request-promise');

const config = require('../config');
const logger = require('../logger');
const { parse } = require('../phoneNumber');

const send = async (mobilePhone: string, message: string, brandId?: BrandId): Promise<SMSResult> => {
  const smsConfig = brandId ? config.sms.moreify.branded[brandId] : config.sms.moreify.general;

  const phoneNumber = parse(mobilePhone) || ''; // TODO: should expect an error
  const options = {
    method: 'POST',
    uri: 'https://mapi.moreify.com/api/v1/sendSms',
    body: {
      project: smsConfig.login,
      password: smsConfig.password,
      phonenumber: `+${phoneNumber}`,
      message,
    },
    json: true,
  };

  logger.debug('sending SMS using moreify:', options);

  try {
    const response = await request(options);
    const result = { ok: response.success, message: 'SMS successfully sent' };

    return result;
  } catch (e) {
    logger.warn('moreify sms send failed:', e);

    const result = { ok: false, message: 'SMS send failed' };
    return result;
  }
};

const smsGateway: SMSProviderApi = {
  send,
};

module.exports = smsGateway;
