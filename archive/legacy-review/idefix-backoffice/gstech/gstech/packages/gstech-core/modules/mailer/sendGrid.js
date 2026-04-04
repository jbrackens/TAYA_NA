/* @flow */
import type { MailProviderApi, MailOptions } from '../types/config';

const sendgrid = require('@sendgrid/mail');

const config = require('../config');
const logger = require('../logger');

sendgrid.setApiKey(config.mailer.sendGrid.token);

const sendMail = async (opts: MailOptions): Promise<void> => {
  try {
    await sendgrid.send(opts);
    logger.debug('Send mail ok', opts.subject, opts.to);
  } catch (e) {
    logger.warn('Send mail failed', opts.subject, opts.to, e);
  }
};

const mailerProvider: MailProviderApi = {
  sendMail,
};

module.exports = mailerProvider;
