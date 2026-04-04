/* @flow */
const Slack = require('slack-node');
const _ = require('lodash');

const config = require('./config');
const logger = require('./logger');
const { guard } = require('./utils');

let slack;

if (config.slack.hook != null) {
  slack = new Slack();
  slack.setWebhook(config.slack.hook);
} else {
  slack = {
    webhook(args, cb) {
      logger.info('Slack Notification', args);
      return (typeof cb === 'function' ? cb(null) : undefined);
    },
  };
}

const cleanFallback = (x: string) => x.replace(/<(.+?)>/g, y => guard(y.split('|')[1], x1 => x1.replace('>', '')) || '');

const cleanText = (text) => {
  if (text && text.trim() !== '') {
    return text;
  }

  return undefined;
};

const sendSlackMessage = channel => async (senderName: string, message: string, tags: string[] = [], attachments: any[] = []) => {
  const slackMessage = {
    channel: !config.isProduction ? '#testing' : channel,
    username: senderName,
    icon_emoji: `:${senderName}:`,
    text: cleanText(`${message} ${tags.map(tag => `#${tag}`).join(' ')}`),
    attachments: attachments.map((attachment) => {
      if (_.isString(attachment)) {
        return { color: 'warning', text: attachment, mrkdwn_in: ['text'], fallback: cleanFallback(attachment) };
      }
      return attachment;
    }),
  };

  slack.webhook(slackMessage, (err, res) => {
    if (res && res.status === 'fail') {
      logger.error('Slack Notification Failed', { res, err });
    }
  });
};

const sendFormattedSlackMessage = channel => (senderName: string, header: string, fields: any, color: 'good' | 'warning' | 'danger' = 'good') => {
  const attachment = {
    color,
    title: header,
    fallback: cleanFallback(header),
    mrkdwn_in: ['pretext', 'text', 'title', 'fields'],
    fields: fields && Object.keys(fields).map(title => (fields[title] && fields[title] !== '' ? { title, value: fields[title], short: true } : {}))
      .filter(obj => Object.keys(obj).length > 0),
  };
  return sendSlackMessage(channel)(senderName, '', [], [attachment]);
};

const sendSlackMessageWithAttachment = channel => (senderName: string, header: string, fields: any) => {
  const attachment = {
    color: 'good',
    mrkdwn_in: ['pretext', 'text', 'fields'],
    fields: fields && Object.keys(fields).map(title => (fields[title] && fields[title] !== '' ? { title, value: fields[title], short: true } : {}))
      .filter(obj => Object.keys(obj).length > 0),
  };
  return sendSlackMessage(channel)(senderName, header, [], [attachment]);
};

module.exports = {
  message: sendSlackMessage('#log'),
  logMessage: sendFormattedSlackMessage('#log'),
  logAffiliateMessage: sendFormattedSlackMessage('#affiliates'),
  logHighrollerMessage: sendFormattedSlackMessage('#log-highroller'),
  logBigWinMessage: sendFormattedSlackMessage('#log-bigwin'),
  logNrcMessage: sendFormattedSlackMessage('#log-nrc'),
  logNdcMessage: sendFormattedSlackMessage('#log-ndc'),
  campaignLogMessage: sendFormattedSlackMessage('#campaign-log'),
  testMessage: sendSlackMessage('#testing'),
  supportMessage: sendSlackMessage('#support'),
  supportTaskMessage: sendSlackMessage('#support-tasks'),
  supportVipMessage: sendSlackMessage('#jefe-lvl-4-and-more'),
  securityMessage: sendFormattedSlackMessage('#security'),
  auditMessage: sendFormattedSlackMessage('#audit'),
  paymentsManualMessage: sendSlackMessageWithAttachment('#payments-manual'),
};
