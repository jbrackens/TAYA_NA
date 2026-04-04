/* @flow */
import type { SMSProvider, SMSAction } from 'gstech-core/modules/constants';

const sms = require('gstech-core/modules/sms');
const logger = require('./logger');

const send = async (
  number: string,
  message: string,
  options?: { brandId?: BrandId, provider?: SMSProvider, action?: SMSAction },
): Promise<boolean> => {
  logger.debug('>>>>>> SMSAPICOM::SEND', { number, message, options });
  const response = await sms.send(number, message, options);
  logger.debug('<<<<<< SMSAPICOM::SEND', { response });
  return response.ok;
};

module.exports = { send };
