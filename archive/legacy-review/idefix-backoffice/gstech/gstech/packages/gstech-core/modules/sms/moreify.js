/* @flow */
import type { SMSResult } from '../types/config';
import type { SMSAction } from '../constants';

const { axios } = require('../axios');
const logger = require('../logger');
const { parse } = require('../phoneNumber');
const { resolveSmsConfigSet } = require('../utils');

const {
  isProduction,
  sms: { moreify },
} = require('../config');

const send = async (
  mobilePhone: string,
  message: string,
  brandId?: BrandId,
  action?: SMSAction,
): Promise<SMSResult> => {
  if (!isProduction) return { ok: false, message: 'Moreify SMSs are disabled in dev mode' };
  const smsConfig = resolveSmsConfigSet<'Moreify'>(moreify, { brandId, action });
  const phoneNumber = parse(mobilePhone) || ''; // TODO: should expect an error
  const options = {
    method: 'POST',
    url: 'https://mapi.moreify.com/api/v1/sendSms',
    data: {
      project: smsConfig.login,
      password: smsConfig.password,
      phonenumber: `+${phoneNumber}`,
      message,
    },
  };
  logger.debug('sending SMS using moreify:', options);
  try {
    const { data: response } = await axios.request(options);
    const result = { ok: response.success, message: 'SMS successfully sent' };
    logger.debug('Moreify sms sent', response, result);
    return result;
  } catch (e) {
    logger.warn('moreify sms send failed:', e);

    const result = { ok: false, message: 'SMS send failed' };
    return result;
  }
};

module.exports = { send };
