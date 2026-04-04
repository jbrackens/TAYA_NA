// @flow
import type { SMSResult } from '../types/config';
import type { SMSAction } from '../constants';

const _ = require('lodash');
const twilio = require('twilio');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const { resolveSmsConfigSet } = require('../utils');
const logger = require('../logger');
const {
  isProduction,
  sms: { twilio: twilioConf },
} = require('../config');

const determineSender = (mobilePhone: string, brandId?: BrandId, action?: SMSAction): string => {
  const smsConfig = resolveSmsConfigSet<'Twilio'>(twilioConf, { brandId, action });
  if (!smsConfig) throw new Error(`Could not resolve Twilio messaging service`);
  if (!smsConfig.senderOverride) return smsConfig.sid;
  if (_.isEmpty(smsConfig.senderOverride)) return smsConfig.sid;
  const c = Object.keys(smsConfig.senderOverride).find((country) =>
    phoneUtil.isValidNumberForRegion(phoneUtil.parse(`+${mobilePhone}`), country),
  );
  return c && smsConfig.senderOverride ? smsConfig.senderOverride[c] : smsConfig.sid;
};

const send = async (
  mobilePhone: string,
  message: string,
  brandId?: BrandId,
  action?: SMSAction,
): Promise<SMSResult> => {
  try {
    // accepted, scheduled, canceled, queued, sending, sent, failed, delivered, undelivered, receiving, received, read
    // const failedStatuses = ['canceled', 'failed', 'undelivered'];
    const okStatuses = [
      'accepted',
      'scheduled',
      'queued',
      'sending',
      'sent',
      'delivered',
      'receiving',
      'received',
      'read',
    ];
    if (!isProduction) return { ok: false, message: 'Twilio SMSs are disabled in development' };

    logger.debug('>>> SMS TWILIO', { mobilePhone, message, brandId, action });
    const smsActionConfig = resolveSmsConfigSet<'Twilio'>(twilioConf, { brandId, action });
    const { accountSid, authToken } = smsActionConfig;
    const client = twilio(accountSid, authToken);
    const messagingServiceSid = determineSender(mobilePhone, brandId);
    const response = await client.messages.create({
      messagingServiceSid,
      to: `+${mobilePhone}`,
      body: message,
    });
    logger.debug('<<< SMS TWILIO', { response });
    return {
      ok: okStatuses.includes(response.status),
      message: response.status || 'invalid',
      messageId: response.sid,
    };
  } catch (error) {
    logger.error('XXX SMS TWILIO', { error });
    return { ok: false, message: error.message };
  }
};

module.exports = { send, determineSender };
