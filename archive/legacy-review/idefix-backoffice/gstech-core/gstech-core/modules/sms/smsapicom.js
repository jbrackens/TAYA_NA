/* @flow */
import type { SMSProviderApi, SMSResult } from '../types/config';

const SMSAPI = require('smsapicom');
const config = require('../config');
const logger = require('../logger');

const createSMSApi = async (brandId?: BrandId): SMSAPI => {
  if (!config.isProduction) return null; // skipping authentication in non-production

  const smsConfig = brandId ? config.sms.smsapicom.branded[brandId] : config.sms.smsapicom.general;
  const smsapi = new SMSAPI();
  try {
    await smsapi.authentication.loginHashed(smsConfig.login, smsConfig.token);
    return smsapi;
  } catch (e) {
    logger.error('smsapicom authentication failed:', e);
    throw e;
  }
};

const smsapis: { [BrandId]: SMSAPI } = {
  CJ: createSMSApi('CJ'),
  KK: createSMSApi('KK'),
  LD: createSMSApi('LD'),
  OS: createSMSApi('OS'),
};

const generalSMSApi = createSMSApi();

const send = async (mobilePhone: string, message: string, brandId?: BrandId): Promise<SMSResult> => {
  const smsapi = await (brandId ? smsapis[brandId] : generalSMSApi);
  const smsConfig = brandId ? config.sms.smsapicom.branded[brandId] : config.sms.smsapicom.general;

  try {
    const response = await smsapi.message.sms().from(smsConfig.sender).to(`+${mobilePhone}`).message(message).execute(); // eslint-disable-line newline-per-chained-call
    const result = { ok: true, message: response.list[0].status || 'INVALID', messageId: response.list[0].id };

    return result;
  } catch (e) {
    logger.error('smsapicom send failed:', e);
    const response = (e.invalid_numbers && e.invalid_numbers[0]) || {};
    const result = { ok: false, message: response.message || 'INVALID' };

    return result;
  }
};

const smsGateway: SMSProviderApi = {
  send,
};

module.exports = smsGateway;
