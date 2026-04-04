/* @flow */
import type { SMSResult } from '../types/config';
import type { SMSAction } from '../constants';

const { SMSAPI } = require('smsapi');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const { resolveSmsConfigSet } = require('../utils');
const logger = require('../logger');

const {
  isProduction,
  sms: { smsapicom },
} = require('../config');

const determineSender = (mobilePhone: string, brandId?: BrandId, action?: SMSAction): string => {
  const smsConfig = resolveSmsConfigSet<'SmsApiCom'>(smsapicom, { brandId, action });
  const c = Object.keys(smsConfig.senderOverride || {}).find((country) =>
    phoneUtil.isValidNumberForRegion(phoneUtil.parse(`+${mobilePhone}`), country),
  );
  return c ? (smsConfig.senderOverride: any)[c] : smsConfig.sender;
};

const send = async (
  mobilePhone: string,
  message: string,
  brandId?: BrandId,
  action?: SMSAction,
): Promise<SMSResult> => {
  try {
    // NOT_FOUND EXPIRED SENT DELIVERED UNDELIVERED FAILED REJECTED UNKNOWN QUEUE ACCEPTED STOP
    // const failedStatuses = ['NOT_FOUND', 'EXPIRED', 'UNDELIVERED', 'FAILED', 'REJECTED'];
    const okStatuses = ['SENT', 'DELIVERED', 'ACCEPTED', 'STOP', 'QUEUE'];
    if (!isProduction) return { ok: false, message: 'SMSAPI.COM is not available in dev mode' };

    logger.debug('>>> SMS SMSAPICOM', { mobilePhone, message, brandId, action });
    const { oauthToken: token } = resolveSmsConfigSet<'SmsApiCom'>(smsapicom, { brandId, action });
    const { sms } = new SMSAPI(token);
    const sender = determineSender(mobilePhone, brandId);
    const response = await sms.sendSms(mobilePhone, message, { from: sender });
    logger.debug('<<< SMS SMSAPICOM', { response });
    const [{ status, id }] = response.list;
    return { ok: okStatuses.includes(status), message: status || 'INVALID', messageId: id };
  } catch (error) {
    logger.error('XXX SMS SMSAPICOM', { error });
    return { ok: false, message: error?.data?.message || 'INVALID' };
  }
};

module.exports = { send, determineSender };
