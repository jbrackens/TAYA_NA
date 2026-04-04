/* @flow */
import type { GameRoundForOptimove } from './repository';

const logger = require('gstech-core/modules/logger');
const {
  getPlayer,
  getDeposit,
  getWithdrawal,
  getGame,
  findRoundTransactions,
} = require('./repository');

const {
  playerRegistrationOptimoveQueue,
  playerUpdateOptimoveQueue,
  playerDepositOptimoveQueue,
  playerWithdrawalOptimoveQueue,
  playerBetOptimoveQueue,
  playerWinOptimoveQueue,
} = require('./Queues');

const queueConfig = {
  priority: 10,
  attempts: 10,
  timeout: 10000,
  backoff: { type: 'exponential', delay: 30 * 1000 },
};

const disabled = true;
const enabledBrands = ['SN', 'VB'];

const notifyPlayerRegistration = async (playerId: Id, tx: Knex) => {
  try {
    if (disabled) return;
    const player = await getPlayer(playerId, tx);
    if (!enabledBrands.includes(player.brandId)) return;
    await playerRegistrationOptimoveQueue.add({ player }, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerRegistration', { playerId }, e);
  }
};

const notifyPlayerUpdate = async (playerId: Id, tx: Knex) => {
  try {
    if (disabled) return;
    const player = await getPlayer(playerId, tx);
    if (!enabledBrands.includes(player.brandId)) return;
    await playerUpdateOptimoveQueue.add({ player }, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerUpdate', { playerId }, e);
  }
};

const notifyPlayerDeposit = async ({ playerId, transactionKey, ...debugAttrs}: any, tx: Knex) => {
  try {
    if (disabled) return;
    const player = await getPlayer(playerId, tx);
    if (!enabledBrands.includes(player.brandId)) return;
    const deposit = await getDeposit(transactionKey, tx);
    await playerDepositOptimoveQueue.add({ player, deposit, transactionKey, ...debugAttrs}, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerDeposit', { playerId, transactionKey }, e);
  }
};

const notifyPlayerWithdrawal = async (playerId: Id, paymentId: Id, tx: Knex) => {
  try {
    if (disabled) return;
    const player = await getPlayer(playerId, tx);
    if (!enabledBrands.includes(player.brandId)) return;
    const withdrawal = await getWithdrawal(paymentId, tx);
    await playerWithdrawalOptimoveQueue.add({ player, withdrawal }, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerWithdrawal', { playerId, paymentId }, e);
  }
};

const notifyPlayerBet = async (
  { gameRoundId, timestamp, gameId, playerId, brandId, ...rest }: any,
  tx: Knex,
) => {
  try {
    if (disabled || !enabledBrands.includes(brandId)) return;
    const gameRoundData: GameRoundForOptimove = {
      gameRoundId,
      timestamp,
      game: await getGame(gameId, tx),
      playerId,
      transactions: await findRoundTransactions(gameRoundId, playerId, tx),
    };
    await playerBetOptimoveQueue.add({ gameRoundData, rest }, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerBet', { playerId, brandId, gameRoundId }, e);
  }
};

const notifyPlayerWin = async (
  { gameRoundId, timestamp, gameId, playerId, brandId, ...rest }: any,
  tx: Knex,
) => {
  try {
    if (disabled || !enabledBrands.includes(brandId)) return;
    const gameRoundData: GameRoundForOptimove = {
      gameRoundId,
      timestamp,
      game: await getGame(gameId, tx),
      playerId,
      transactions: await findRoundTransactions(gameRoundId, playerId, tx),
    };
    await playerWinOptimoveQueue.add({ gameRoundData, rest }, queueConfig);
  } catch (e) {
    logger.error('optimove notifyPlayerWin', { playerId, brandId, gameRoundId }, e);
  }
};

module.exports = {
  notifyPlayerRegistration,
  notifyPlayerUpdate,
  notifyPlayerDeposit,
  notifyPlayerWithdrawal,
  notifyPlayerBet,
  notifyPlayerWin,
};
