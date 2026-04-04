/* @flow */
const { getPlayer, getDeposit, getWithdrawal } = require('./repository');

const {
  playerRegistrationNotificationQueue,
  playerUpdateNotificationQueue,
  playerDepositNotificationQueue,
  playerWithdrawalNotificationQueue,
} = require('./Queues');

const queueConfig = {
  priority: 10,
  attempts: 10,
  timeout: 10000,
  backoff: { type: 'exponential', delay: 30 * 1000 },
};

const disabled = true;

const notifyPlayerRegistration = async (playerId: Id, tx: Knex) => {
  if (disabled) return;
  const player = await getPlayer(playerId, tx);
  await playerRegistrationNotificationQueue.add({ player }, queueConfig);
};

const notifyPlayerUpdate = async (playerId: Id, tx: Knex) => {
  if (disabled) return;
  const player = await getPlayer(playerId, tx);
  await playerUpdateNotificationQueue.add({ player }, queueConfig);
};

const notifyPlayerDeposit = async (playerId: Id, transactionKey: string, tx: Knex) => {
  if (disabled) return;
  const player = await getPlayer(playerId, tx);
  const deposit = await getDeposit(transactionKey, tx);
  await playerDepositNotificationQueue.add({ player, deposit }, queueConfig);
};

const notifyPlayerWithdrawal = async (playerId: Id, paymentId: Id, tx: Knex) => {
  if (disabled) return;
  const player = await getPlayer(playerId, tx);
  const withdrawal = await getWithdrawal(paymentId, tx);
  await playerWithdrawalNotificationQueue.add({ player, withdrawal }, queueConfig);
};

module.exports = {
  notifyPlayerRegistration,
  notifyPlayerUpdate,
  notifyPlayerDeposit,
  notifyPlayerWithdrawal,
};
