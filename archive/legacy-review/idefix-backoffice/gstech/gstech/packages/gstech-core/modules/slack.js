/* @flow */
const { IncomingWebhook } = require('@slack/webhook');
const _ = require('lodash');

const config = require('./config');
const logger = require('./logger');
const { guard } = require('./utils');

let slack;

const inTest =
  process.env.NODE_ENV === 'test' ||
  process.env.CI === 'true' ||
  process.env.CI_ENV === 'true' ||
  process.env.CI_DEP === 'true';

if (!inTest && config.slack.hook != null) {
  slack = new IncomingWebhook(config.slack.hook);
} else {
  slack = {
    send(args: {
  attachments: Array<
      | any
      | {
        color: string,
        fallback: string,
        mrkdwn_in: Array<string>,
        text: any,
      }>,
  channel: string,
  icon_emoji: string,
  text: void | string,
  username: string,
}) {
      return new Promise((res) => {
        logger.info('Slack Notification', { args });
        res(null);
      });
    },
  };
}

const cleanFallback = (x: string): string =>
  x.replace(/<(.+?)>/g, (y) => guard(y.split('|')[1], (x1) => x1.replace('>', '')) || '');

const cleanText = (text: string) => {
  if (text && text.trim() !== '') {
    return text;
  }

  return undefined;
};

const sendSlackMessage =
  (channel: string) =>
  (senderName: string, message: string, tags: string[] = [], attachments: any[] = []): void => {
    const slackMessage = {
      channel: !config.isProduction ? '#testing' : channel,
      username: senderName,
      icon_emoji: `:${senderName}:`,
      text: cleanText(`${message} ${tags.map((tag) => `#${tag}`).join(' ')}`),
      attachments: attachments.map((attachment) => {
        if (_.isString(attachment)) {
          return {
            color: 'warning',
            text: attachment,
            mrkdwn_in: ['text'],
            fallback: cleanFallback(attachment),
          };
        }
        return attachment;
      }),
    };

    slack
      .send(slackMessage)
      .then((res) => {
        if (res && res.status === 'fail') logger.error('Slack Notification Failed', { res });
        else logger.info('Slack Notification', { slackMessage, res });
      })
      .catch((err) => {
        logger.error('Slack Notification Failed', { err });
      });
  };

const sendFormattedSlackMessage =
  (channel: string) =>
  (
    senderName: string,
    header: string,
    fields: any,
    color: 'good' | 'warning' | 'danger' = 'good',
  ): void => {
    const attachment = {
      color,
      title: header,
      fallback: cleanFallback(header),
      mrkdwn_in: ['pretext', 'text', 'title', 'fields'],
      fields:
        fields &&
        Object.keys(fields)
          .map((title) =>
            fields[title] && fields[title] !== ''
              ? { title, value: fields[title], short: true }
              : {},
          )
          .filter((obj) => Object.keys(obj).length > 0),
    };
    return sendSlackMessage(channel)(senderName, '', [], [attachment]);
  };

const sendSlackMessageWithAttachment =
  (channel: string) =>
  (senderName: string, header: string, fields: any): void => {
    const attachment = {
      color: 'good',
      mrkdwn_in: ['pretext', 'text', 'fields'],
      fields:
        fields &&
        Object.keys(fields)
          .map((title) =>
            fields[title] && fields[title] !== ''
              ? { title, value: fields[title], short: true }
              : {},
          )
          .filter((obj) => Object.keys(obj).length > 0),
    };
    return sendSlackMessage(channel)(senderName, header, [], [attachment]);
  };

const loggers: { [string]: any } = {
  logMessage: sendFormattedSlackMessage('#log'),
  logAffiliateMessage: sendFormattedSlackMessage('#affiliate-log'),
  logHighrollerMessage: sendFormattedSlackMessage('#log-highroller'),
  logSNVBHighrollerMessage: sendFormattedSlackMessage('#log-sn-vb-highroller'),
  logBigWinMessage: sendFormattedSlackMessage('#log-bigwin'),
  testMessage: sendSlackMessage('#testing'),
  securityMessage: sendFormattedSlackMessage('#security'),
  paymentsManualMessage: sendSlackMessageWithAttachment('#payments-manual'),
  logVipBirthdayMessage: sendFormattedSlackMessage('#vip-birthdays-public'),
};

module.exports = loggers;
