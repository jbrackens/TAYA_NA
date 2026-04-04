/* @flow */
import type { PlayerUpdateType } from 'gstech-core/modules/types/bus';

const logger = require('gstech-core/modules/logger');
const {
  playerNotificationQueue,
  depositNotificationQueue,
  withdrawalNotificationQueue,
  playerCheckQueue,
} = require('./Queues');

const updatePlayer = async (playerId: Id, updateType: PlayerUpdateType = 'Default', priority: number = 2) => {
  await playerNotificationQueue.add({ playerId, updateType }, { attempts: 5, timeout: 10000, backoff: { priority, type: 'exponential', delay: 30 * 1000 } });
};

const notifyWithdrawal = async (playerId: Id, withdrawalId: Id, userId: Id) => {
  logger.debug('notifyWithdrawal', { playerId, withdrawalId, userId });
  await withdrawalNotificationQueue.add({ playerId, withdrawalId, userId }, { priority: 10, attempts: 10, timeout: 10000, backoff: { type: 'exponential', delay: 30 * 1000 } });
};

const notifyDeposit = async (playerId: Id, transactionKey: UUID) => {
  await depositNotificationQueue.add({ playerId, transactionKey }, { priority: 1, attempts: 10, timeout: 10000, backoff: { type: 'exponential', delay: 30 * 1000 } });
};

const playerCheck = async (playerId: Id, ipAddress: IPAddress) => {
  await playerCheckQueue.add({ playerId, ipAddress }, { priority: 1, attempts: 10, timeout: 10000, backoff: { type: 'exponential', delay: 30 * 1000 } });
};

module.exports = {
  updatePlayer,
  notifyWithdrawal,
  notifyDeposit,
  playerCheck,
};
