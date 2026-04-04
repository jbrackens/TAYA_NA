/* @flow */
const logger = require('gstech-core/modules/logger');
const {
  playerRegistrationNotificationQueue,
  playerUpdateNotificationQueue,
  playerDepositNotificationQueue,
  playerWithdrawalNotificationQueue,
} = require('./Queues');
// require('./self-consumer'); // TODO: temporary self consuming eeg events

const PlayerRegistrationNotificationWorker = require('./workers/PlayerRegistrationNotificationWorker');
const PlayerUpdateNotificationWorker = require('./workers/PlayerUpdateNotificationWorker');
const PlayerDepositNotificationWorker = require('./workers/PlayerDepositNotificationWorker');
const PlayerWithdrawalNotificationWorker = require('./workers/PlayerWithdrawalNotificationWorker');

logger.info('EEG Worker started');

playerRegistrationNotificationQueue.process(PlayerRegistrationNotificationWorker.handleJob);
playerUpdateNotificationQueue.process(PlayerUpdateNotificationWorker.handleJob);
playerDepositNotificationQueue.process(PlayerDepositNotificationWorker.handleJob);
playerWithdrawalNotificationQueue.process(PlayerWithdrawalNotificationWorker.handleJob);
