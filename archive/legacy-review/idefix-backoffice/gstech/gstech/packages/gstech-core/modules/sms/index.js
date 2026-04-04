/* @flow */
import type { SMSAction, SMSProvider } from '../constants';
import type { SMSProviderApi, SMSResult } from '../types/config';

const config = require('../config');
const logger = require('../logger');
const slack = require('../slack');

const phoneEmu = require('./phoneEmu');
const moreify = require('./moreify');
const smsapicom = require('./smsapicom');
const twilio = require('./twilio');

const providers: { [SMSProvider]: SMSProviderApi } = {
  Moreify: moreify,
  SmsApiCom: smsapicom,
  Twilio: twilio,
};

const send = async (
  mobilePhone: string,
  message: string,
  options?: { brandId?: BrandId, provider?: SMSProvider, action?: SMSAction },
): Promise<SMSResult> => {
  logger.debug('>>>>>>> CORE::SMS::SEND', { mobilePhone, message, options });

  if (config.isProduction) {
    const providersOnRotation = ['Twilio'];

    const providerName =
      (options && options.provider) ||
      providersOnRotation[Math.floor(Math.random() * providersOnRotation.length)];
    const provider = providers[providerName];
    const brandId = options && options.brandId;
    const action = options && options.action;
    const result = provider.send(mobilePhone, message, brandId, action);

    logger.debug(`<<<<<<< CORE::SMS::SEND Using ${providerName}`, { result });
    return result;
  }

  await slack.testMessage('phone', `SMS for number *${mobilePhone}*: ${message}`);
  phoneEmu.send({ mobilePhone, message });
  const result = { ok: true, message: 'SMS has been sent using phoneEmu' };

  logger.debug('<<<<<<< CORE::SMS::SEND Using phoneEmu', { result });
  return result;
};

module.exports = {
  send,
};
