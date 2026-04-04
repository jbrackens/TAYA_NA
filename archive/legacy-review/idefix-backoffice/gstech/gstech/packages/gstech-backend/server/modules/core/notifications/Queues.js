/* @flow */
import type {JobQueue} from 'gstech-core/modules/queue';

const { createQueue } = require('gstech-core/modules/queue');

const playerNotificationQueue: JobQueue<any> = createQueue<any>('playerNotification');
const withdrawalNotificationQueue: JobQueue<any> = createQueue<any>('withdrawalNotification');
const depositNotificationQueue: JobQueue<any> = createQueue<any>('depositNotification');
const playerCheckQueue: JobQueue<any> = createQueue<any>('playerCheckQueue');

module.exports = {
  playerNotificationQueue,
  withdrawalNotificationQueue,
  depositNotificationQueue,
  playerCheckQueue,
};
