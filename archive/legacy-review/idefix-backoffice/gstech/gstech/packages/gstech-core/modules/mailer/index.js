/* @flow */
import type { MailerProvider } from '../constants';
import type { MailProviderApi, MailOptions } from '../types/config';

const config = require('../config');
const logger = require('../logger');

const mailEmu = require('./mailEmu');
const mockMailer = require('./mockMailer');
const sendGrid = require('./sendGrid');

const providers: { [MailerProvider]: MailProviderApi } = {
  SendGrid: sendGrid,
};

const sendMail = async (opts: MailOptions): Promise<void> => {
  logger.debug('>>>>>>> CORE::EMAIL::SEND', { subject: opts.subject, to: opts.to });

  if (config.isProduction) {
    const providerName = config.mailer.defaultProvider;

    const provider = providers[providerName];
    const result = provider.sendMail(opts);

    logger.debug(`<<<<<<< CORE::EMAIL::SEND Using ${providerName}`, { result });
    return result;
  }

  if (config.mailer.mockMailerPort) {
    const mockResult = await mockMailer.sendMail(opts);
    logger.debug(`<<<<<<< CORE::EMAIL::SEND Using MOCK`, { mockResult });
  }

  logger.debug('<<<<<<< CORE::EMAIL::SEND Using mailEmu');
  return mailEmu.send({ to: opts.to, text: opts.text, html: opts.html });
};

module.exports = {
  sendMail,
};
