/* @flow */
import type { SMSResult } from '../types/config';

const { Subject } = require('rxjs');
const slack = require('../slack');

const smsSubj = new Subject();

const sendSms = async (to: string, message: string): Promise<SMSResult> => {
  smsSubj.next({ to, message });
  await slack.testMessage('phone', `SMS for number *${to}*: ${message}`);

  return { ok: true, message: 'SMS has been sent using phoneEmu' };
};

const registerSmsReceiver = (handler: ({ to: string, message: string }) => void) => {
  smsSubj.subscribe({ next: sms => handler(sms) });
};

module.exports = {
  sendSms,
  registerSmsReceiver,
};
