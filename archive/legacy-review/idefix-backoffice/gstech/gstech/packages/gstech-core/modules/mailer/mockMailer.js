// @flow
import type { MailProviderApi, MailOptions } from '../types/config';

const nodemailer = require('nodemailer');

const config = require('../config');
const logger = require('../logger');

type MockMailerTransport = {
  sendMail: (opts: {
    from: string,
    to: string,
    subject: string,
    ['html' | 'text']: string,
  }) => Promise<void>,
};

let mockMailerTransport: ?MockMailerTransport;

if (!config.isProduction && config.mailer.mockMailerPort !== null && !mockMailerTransport) {
  mockMailerTransport = nodemailer.createTransport({
    host: 'localhost',
    port: config.mailer.mockMailerPort,
    ignoreTLS: true,
  });
}

const sendMail = async (opts: MailOptions): Promise<void> => {
  try {
    if (mockMailerTransport) {
      logger.debug('>>> sendMail:MOCK', { from: opts.from, to: opts.to, subject: opts.subject });
      await mockMailerTransport.sendMail({
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      logger.debug('<<< sendMail:MOCK', { from: opts.from, to: opts.to, subject: opts.subject });
    }
  } catch (err) {
    logger.warn('!!! sendMail:MOCK', { err, from: opts.from, to: opts.to, subject: opts.subject });
  }
};

const mailerProvider: MailProviderApi = {
  sendMail,
};

module.exports = mailerProvider;
