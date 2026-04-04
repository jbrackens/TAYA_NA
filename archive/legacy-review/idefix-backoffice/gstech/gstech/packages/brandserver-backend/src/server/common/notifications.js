/* @flow */
import type { Journey } from './api';

const _ = require('lodash');
const { marked } = require('marked');
const removeMarkdown = require('remove-markdown');
const campaignserverApi = require('gstech-core/modules/clients/campaignserver-api');
const logger = require('gstech-core/modules/logger');
const utils = require('./utils');
const redis = require('./redis');
const { defaultLanguage } = require('./localization');

export type Notification = {
  id: string,
  unread: boolean,
  important: boolean,
  action: string,
  image: string,
  title: string,
  banner: string,
  content: string,
  disclaimer: string,
  actiontext: string,
  openOnLogin: boolean,
};

const markAsRead = async (req: express$Request, id: string) => {
  if (id.indexOf(':') !== -1) {
    const [campaignId, contentId] = id.split(':');
    await campaignserverApi.addContentEvent(Number(campaignId), req.context.playerId, {
      text: 'view',
      contentId: Number(contentId),
    });
  } else {
    await redis.setTemporary('notification-read', `${req.context.playerId}-${id}`, true, 60 * 60 * 24 * 30);
  }
};
const getLegacyNotifications = async (req: express$Request, journey: Journey, type: string = '') =>
  Promise.all(journey
    .activeNotifications(req.context, type)
    .map(async (notification) => {
      const read = await redis.getTemporary('notification-read', `${req.context.playerId}-${notification.id}`);
      return {
      ...notification,
        unread: read == null,
      }
    }));

const mapNotification = (req: express$Request) => (
  {
    campaignId,
    contentId,
    content,
    events
  }: {
    campaignId: string,
    content: any,
    contentId: string,
    events: Array<{ extras: { ... } | null, text: string, timestamp: Date }>,
    externalId: string,
    name: string,
  },
): Notification => {
  const l = content[req.context.languageISO] || content[defaultLanguage().code] || {};
  if (_.isEmpty(l)) {
    logger.warn('Invalid notification', req.context.languageISO, defaultLanguage().code, content);
  }
  return {
    id: `${campaignId}:${contentId}`,
    unread: !_.some(events, (x) => x.text === 'view'),
    important: content.important,
    action: content.action,
    image: content.image,
    disclaimer: l.disclaimer,
    title: l.title,
    banner: content.banner,
    content: l.content,
    actiontext: l.actiontext,
    openOnLogin: content.openOnLogin,
  };
};

const getNotifications = async (req: express$Request, journey: Journey, type?: 'myjefe'): Promise<Notification[]> => {
  const legacyNotifications = await getLegacyNotifications(req, journey, type || '');
  let campaignServerNotifications: Array<Notification> = [];
  if (type == null) { // When type is myjefe, only legacy notifications are used
    const notifications = await campaignserverApi.getPlayerNotifications(req.context.playerId);
    campaignServerNotifications = notifications.map(mapNotification(req));
  }
  return [...campaignServerNotifications, ...legacyNotifications].filter(x => x.content != null && x.title != null);;
}

const formatNotification = (req: express$Request) => (notification: Notification): Notification => {
  const content = marked(notification.content);
  const disclaimer = notification.disclaimer ? marked(notification.disclaimer) : '';
  return {
    ..._.pick(notification, 'id', 'important', 'action', 'image', 'title', 'banner', 'actiontext', 'unread', 'openOnLogin'),
    image: utils.populate(notification.image, { lang: req.context.languageISO }),
    extract: removeMarkdown(notification.content),
    content,
    disclaimer,
  };
}

const forUser = async (req: express$Request, journey: Journey, type?: 'myjefe'): Promise<Notification[]> => {
  const notifications = await getNotifications(req, journey, type);
  return notifications.map(formatNotification(req));
};

const numberOfNotifications = (req: express$Request, journey: Journey): Promise<number> =>
  getNotifications(req, journey).then(x => x.filter(y => y.unread).length);

const notificationForUser = async (req: express$Request, journey: Journey, id: string): Promise<any> => {
  await markAsRead(req, id);
  const x = await getNotifications(req, journey);
  const notification = _.find(x, y => y.id === parseInt(id) || y.id === id);
  if (notification) {
    return formatNotification(req)(notification);
  }
  return null;
};

module.exports = { forUser, numberOfNotifications, notificationForUser };
