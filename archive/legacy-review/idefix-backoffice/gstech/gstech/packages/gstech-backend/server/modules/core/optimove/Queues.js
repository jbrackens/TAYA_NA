/* @flow */
import type { JobQueue } from 'gstech-core/modules/queue';

const { createQueue } = require('gstech-core/modules/queue');

const playerRegistrationOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerRegistration');
const playerUpdateOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerUpdate');
const playerDepositOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerDeposit');
const playerWithdrawalOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerWithdrawal');
const playerBetOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerBet');
const playerWinOptimoveQueue: JobQueue<any> = createQueue<any>('optimove-playerWin');

module.exports = {
  playerRegistrationOptimoveQueue,
  playerUpdateOptimoveQueue,
  playerDepositOptimoveQueue,
  playerWithdrawalOptimoveQueue,
  playerBetOptimoveQueue,
  playerWinOptimoveQueue,
};
