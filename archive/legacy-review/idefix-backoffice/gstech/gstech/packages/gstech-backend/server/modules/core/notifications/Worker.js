/* @flow */
const logger = require('gstech-core/modules/logger');
const {
  playerNotificationQueue,
  depositNotificationQueue,
  withdrawalNotificationQueue,
  playerCheckQueue,
} = require('./Queues');

const PlayerNotificationWorker = require('./workers/PlayerNotificationWorker');
const WithdrawalNotificationWorker = require('./workers/WithdrawalNotificationWorker');
const DepositNotificationWorker = require('./workers/DepositNotificationWorker');
const PlayerCheckWorker = require('./workers/PlayerCheckWorker');

logger.info('Worker started');

playerNotificationQueue.process(PlayerNotificationWorker.handleJob);
withdrawalNotificationQueue.process(WithdrawalNotificationWorker);
depositNotificationQueue.process(DepositNotificationWorker.handleJob);
playerCheckQueue.process(PlayerCheckWorker.handleJob);
