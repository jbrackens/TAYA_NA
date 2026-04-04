/* @flow */
import type { SMSProvider } from '../constants';
import type { SMSProviderApi, SMSResult } from '../types/config';

const config = require('../config');
const logger = require('../logger');

const phoneEmu = require('./phoneEmu');
const moreify = require('./moreify');
const smsapicom = require('./smsapicom');

const providers: { [SMSProvider]: SMSProviderApi } = {
  Moreify: moreify,
  SmsApiCom: smsapicom,
};

const send = async (mobilePhone: string, message: string, options?: { brandId?: BrandId, provider?: SMSProvider }): Promise<SMSResult> => {
  logger.debug('sending SMS:', { mobilePhone, message, options });

  if (config.isProduction) {
    const providerName = (options && options.provider) || config.sms.defaultProvider;
    const brandId = options && options.brandId;

    const provider = providers[providerName];
    const result = provider.send(mobilePhone, message, brandId);

    logger.debug('SMS sent:', { mobilePhone, message, options, result });
    return result;
  }

  logger.debug('sending SMS using phoneEmu...');
  return phoneEmu.sendSms(mobilePhone, message);
};

module.exports = {
  send,
};
