/* @flow */
import type { Player } from 'gstech-core/modules/types/player';

const { v1: uuid } = require('uuid');
const times = require('lodash/fp/times');
const promiseLimit = require('promise-limit');
const sample = require('lodash/fp/sample');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { startDeposit, processDeposit } = require('../server/modules/payments/deposits/Deposit');
const { createWithdrawal } = require('../server/modules/payments/withdrawals/Withdrawal');
const { placeBet } = require('../server/modules/game_round');
const { createSession, createManufacturerSession } = require('../server/modules/sessions');
const { findOrCreateAccount } = require('../server/modules/accounts');
const { getWithProfile } = require('../server/modules/games');
const { getAvailableDepositBonuses } = require('../server/modules/bonuses');


const limit = promiseLimit(100);

const fakeTransactions = async (player: Player) => {
  const { id, brandId } = player;
  logger.debug('Adding fake transactions to player', player.username);  
  const session = await createSession({ id, brandId }, '1.2.3.4');
  const mSessionId = await createManufacturerSession('NE', uuid(), session.id);
  const game = await getWithProfile('LD', 'NE', 'starburst_not_mobile_sw');
  const money = (amount: number) => (['SEK', 'NOK'].indexOf(player.currencyId) === -1 ? amount : amount * 10);

  const round = async (bet: number, win: number) => {
    const externalGameRoundId = uuid();
    await placeBet(player.id, {
      manufacturerId: 'NE',
      game,
      sessionId: session.id,
      manufacturerSessionId: mSessionId,
      amount: money(bet),
      externalGameRoundId,
      externalTransactionId: uuid(),
      closeRound: true,
      timestamp: new Date(),
    }, [{ type: 'win', amount: money(win) }]);
  };

  const rounds = (n: number, bet: number, win: number) => Promise.all(times(() => limit(async () => round(bet, win)), n));

  const deposit = async (amount: number, bonus: Id) => {
    const { transactionKey } = await startDeposit(player.id, sample([1, 2, 3, 4, 5]), money(amount), bonus);
    await processDeposit(money(amount), transactionKey, 'XXXXX123123123', null, uuid(), 'complete');
  };

  const withdraw = async (amount: number) => {
    const accountId = await pg.transaction(tx => findOrCreateAccount(player.id, 1, 'XXXXX123123123', null, null, { bic: 'XXXXX123123123' }, tx));
    return createWithdrawal(player.id, session.id, accountId, money(amount));
  };
  const bonuses1 = await getAvailableDepositBonuses(player.id);
  await deposit(2500, bonuses1[0].id);
  await rounds(5, 500, 0);
  await round(500, 52000);
  await rounds(5, 500, 0);
  await round(500, 520);
  await rounds(7, 500, 0);
  await round(500, 12520);
  await rounds(8, 500, 0);
  const bonuses2 = await getAvailableDepositBonuses(player.id);
  await deposit(2500, bonuses2[0].id);
  await rounds(8, 500, 0);
  await round(500, 25000);
  await rounds(10, 500, 0);
  await round(500, 375500);
  await round(500, 50);
  await round(500, 250);
  await rounds(700, 500, 0);
  await withdraw(100000);
  logger.debug('Transactions added');
};

module.exports = { fakeTransactions };
