/* @flow */
const logger = require('gstech-core/modules/logger');
const {
  playerRegistrationOptimoveQueue,
  playerUpdateOptimoveQueue,
  playerDepositOptimoveQueue,
  playerWithdrawalOptimoveQueue,
  playerBetOptimoveQueue,
  playerWinOptimoveQueue,
} = require('./Queues');

const PlayerRegistrationOptimoveWorker = require('./workers/PlayerRegistrationOptimoveWorker');
const PlayerUpdateOptimoveWorker = require('./workers/PlayerUpdateOptimoveWorker');
const PlayerDepositOptimoveWorker = require('./workers/PlayerDepositOptimoveWorker');
const PlayerWithdrawalOptimoveWorker = require('./workers/PlayerWithdrawalOptimoveWorker');
const PlayerBetOptimoveWorker = require('./workers/PlayerBetOptimoveWorker');
const PlayerWinOptimoveWorker = require('./workers/PlayerWinOptimoveWorker');

logger.info('Optimove Worker started');

playerRegistrationOptimoveQueue.process(PlayerRegistrationOptimoveWorker.handleJob);
playerUpdateOptimoveQueue.process(PlayerUpdateOptimoveWorker.handleJob);
playerDepositOptimoveQueue.process(PlayerDepositOptimoveWorker.handleJob);
playerWithdrawalOptimoveQueue.process(PlayerWithdrawalOptimoveWorker.handleJob);
playerBetOptimoveQueue.process(PlayerBetOptimoveWorker.handleJob);
playerWinOptimoveQueue.process(PlayerWinOptimoveWorker.handleJob);
