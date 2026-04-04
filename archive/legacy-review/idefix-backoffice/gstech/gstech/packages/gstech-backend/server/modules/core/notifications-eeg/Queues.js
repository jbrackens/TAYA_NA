/* @flow */
import type { JobQueue } from 'gstech-core/modules/queue';

const { createQueue } = require('gstech-core/modules/queue');

const playerRegistrationNotificationQueue: JobQueue<any> = createQueue<any>('eeg-playerRegistrationNotification');
const playerUpdateNotificationQueue: JobQueue<any> = createQueue<any>('eeg-playerUpdateNotification');
const playerDepositNotificationQueue: JobQueue<any> = createQueue<any>('eeg-playerDepositNotification');
const playerWithdrawalNotificationQueue: JobQueue<any> = createQueue<any>('eeg-playerWithdrawalNotification');

module.exports = {
  playerRegistrationNotificationQueue,
  playerUpdateNotificationQueue,
  playerDepositNotificationQueue,
  playerWithdrawalNotificationQueue,
};
