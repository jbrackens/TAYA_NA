/* @flow */
import type {
  CreditBonusTxType,
  CreditRealTxType,
  CreditReservedRealMoneyTxType,
  DebitBonusTxType,
  DebitReservedMoneyTxType,
  DebitReservedRealMoneyTxType,
  DebitTxType,
  TxType,
  TransactionSummary
} from "gstech-core/modules/clients/backend-api-types";

const _ = require('lodash');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const errors = require('gstech-core/modules/errors/wallet-error-codes');

export type CreditRealMoneyTransaction = { amount: Money, type: CreditRealTxType, gameRoundId: ?Id, playerBonusId: ?Id, manufacturerId: ?string, externalTransactionId: ?string };
const creditRealMoneyTransaction = async (playerId: Id, { amount, type, gameRoundId, playerBonusId, manufacturerId, externalTransactionId }: CreditRealMoneyTransaction, tx: Knex): Promise<Id> => {
  const [{ balance, bonusBalance, reservedBalance }] = await tx('players')
    .update({ balance: pg.raw('"balance" + ?', amount) }, ['balance', 'bonusBalance', 'reservedBalance'])
    .where('id', playerId);
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount: 0,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      playerBonusId,
      manufacturerId,
      externalTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};

export type TurnBonusToRealTransaction = { bonusAmount: Money, playerBonusId: Id, gameRoundId: ?Id, manufacturerId: ?string, externalTransactionId: ?string };
const turnBonusToRealTransaction = (
  playerId: Id,
  {
    bonusAmount,
    playerBonusId,
    gameRoundId,
    manufacturerId,
    externalTransactionId,
  }: TurnBonusToRealTransaction,
  tx: Knex,
): Promise<void> =>
  Promise.all([
    tx('players')
      .update(
        {
          balance: pg.raw('"balance" + ?', bonusAmount),
          bonusBalance: pg.raw('"bonusBalance" - ?', bonusAmount),
        },
        ['balance', 'bonusBalance', 'reservedBalance'],
      )
      .where('id', playerId),
  ]).then(([[{ balance, bonusBalance, reservedBalance }]]) =>
    tx('transactions').insert({
      playerId,
      type: 'turn_bonus_to_real',
      amount: bonusAmount,
      bonusAmount,
      playerBonusId,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      timestamp: pg.raw('now()')
    }),
  );

export type CreditReservedRealMoneyTransaction = {
  amount: Money,
  type: CreditReservedRealMoneyTxType,
  gameRoundId: ?Id,
  playerBonusId: ?Id,
  externalTransactionId: ?string,
  targetTransactionId: Id,
};
const creditReservedRealMoneyTransaction = async (playerId: Id, {
  amount,
  type,
  gameRoundId,
  playerBonusId,
  externalTransactionId,
  targetTransactionId,
}: CreditReservedRealMoneyTransaction, tx: Knex): Promise<Id> => {
  const [{ balance, bonusBalance, reservedBalance }] = await tx('players')
    .update({ balance: pg.raw('"balance" + ?', amount), reservedBalance: pg.raw('"reservedBalance" - ?', amount) }, ['balance', 'bonusBalance', 'reservedBalance'])
    .where('id', playerId);
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount: 0,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      playerBonusId,
      externalTransactionId,
      targetTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id')
  return transactionId;
};

export type DebitReservedRealMoneyTransaction = { amount: Money, type: DebitReservedRealMoneyTxType, gameRoundId: ?Id, manufacturerId: ?string, externalTransactionId: ?string };
const debitReservedRealMoneyTransaction = async (playerId: Id, { amount, type, gameRoundId, manufacturerId, externalTransactionId }: DebitReservedRealMoneyTransaction, tx: Knex): Promise<Id> => {
  const [{ balance, bonusBalance, reservedBalance }] = await tx('players')
    .update({ balance: pg.raw('"balance" - ?', amount), reservedBalance: pg.raw('"reservedBalance" + ?', amount) }, ['balance', 'bonusBalance', 'reservedBalance'])
    .where('id', playerId);
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount: 0,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};

export type DebitReservedMoneyTransaction = { amount: Money, type: DebitReservedMoneyTxType, manufacturerId: ?string, externalTransactionId: ?string };
const debitReservedMoneyTransaction = async (playerId: Id, { amount, type, manufacturerId, externalTransactionId }: DebitReservedMoneyTransaction, tx: Knex$Transaction<any>): Promise<Id> => {
  const [{ balance, bonusBalance, reservedBalance }] = await tx('players')
    .update({ reservedBalance: pg.raw('"reservedBalance" - ?', amount) }, ['balance', 'bonusBalance', 'reservedBalance'])
    .where('id', playerId);
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount: 0,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};

export type CreditTransaction = {
  playerBonusId: ?Id,
  amount: Money,
  bonusAmount: Money,
  type: CreditRealTxType | CreditBonusTxType,
  gameRoundId: ?Id,
  manufacturerId: ?string,
  externalTransactionId: ?string,
  subTransactionId: ?Id,
  targetTransactionId: ?Id,
};
const creditTransaction = async (playerId: Id, {
  playerBonusId,
  amount,
  bonusAmount,
  type,
  gameRoundId,
  manufacturerId,
  externalTransactionId,
  subTransactionId,
  targetTransactionId,
}: CreditTransaction, tx: Knex): Promise<Id> => {
  const [[{ balance, bonusBalance, reservedBalance }], bonusUpdates] = await Promise.all([
    tx('players')
      .update({ balance: pg.raw('"balance" + ?', amount), bonusBalance: pg.raw('"bonusBalance" + ?', bonusAmount) })
      .where('id', playerId)
      .returning(['balance', 'bonusBalance', 'reservedBalance']),
    bonusAmount > 0
      ? tx('player_bonuses').update({ balance: pg.raw('"balance" + ?', bonusAmount) }).where({ id: playerBonusId, status: 'active' }) : 0,
  ]);
  if (bonusUpdates === 0 && bonusAmount > 0) {
    const bonus = await tx('player_bonuses').first('*').where({ id: playerBonusId });
    logger.warn('creditTransaction failed', { playerId, playerBonusId, type, amount, bonusAmount, balance, bonusBalance, reservedBalance, bonus });
    throw new Error('Unable to credit bonus money when bonus is not active');
  }
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount,
      playerBonusId,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      subTransactionId,
      targetTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};


export type CreditBonusTransaction = { playerBonusId: Id, bonusAmount: Money, type: CreditBonusTxType, gameRoundId: ?Id, manufacturerId: ?string, externalTransactionId: ?string };
const creditBonusTransaction = (playerId: Id, { playerBonusId, bonusAmount, type, gameRoundId, manufacturerId, externalTransactionId }: CreditBonusTransaction, tx: Knex): Promise<Id> =>
  creditTransaction(playerId, {
    playerBonusId,
    bonusAmount,
    type,
    gameRoundId,
    manufacturerId,
    externalTransactionId,
    amount: 0,
    subTransactionId: 0,
    targetTransactionId: null,
  }, tx);

export type DebitBonusTransaction = { playerBonusId: Id, bonusAmount: Money, type: DebitBonusTxType, gameRoundId: ?Id, manufacturerId: ?string, externalTransactionId: ?string };
const debitBonusTransaction = async (playerId: Id, { playerBonusId, bonusAmount, type, gameRoundId, manufacturerId, externalTransactionId }: DebitBonusTransaction, tx: Knex): Promise<Id> => {
  const [[{ balance, bonusBalance, reservedBalance }]] = await Promise.all([
    tx('players')
      .update({ bonusBalance: pg.raw('"bonusBalance" - ?', bonusAmount) }, ['balance', 'bonusBalance', 'reservedBalance'])
      .where('id', playerId),
    tx('player_bonuses')
      .update({ balance: pg.raw('"balance" - ?', bonusAmount) }, ['balance'])
      .where('id', playerBonusId),
  ]);
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount: 0,
      bonusAmount,
      playerBonusId,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};

export type DebitTransaction = {
  playerBonusId: ?Id,
  amount: Money,
  bonusAmount: Money,
  type: DebitTxType,
  gameRoundId: ?Id,
  manufacturerId: ?string,
  externalTransactionId: ?string,
  subTransactionId: Id,
  targetTransactionId: ?Id,
};
const debitTransaction = async (playerId: Id, {
  playerBonusId,
  amount,
  bonusAmount,
  type,
  gameRoundId,
  manufacturerId,
  externalTransactionId,
  subTransactionId,
  targetTransactionId,
}: DebitTransaction, tx: Knex): Promise<Id> => {
  const [[{ balance, bonusBalance, reservedBalance }], bonusUpdates] = await Promise.all([
    tx('players')
      .update({ bonusBalance: pg.raw('"bonusBalance" - ?', bonusAmount), balance: pg.raw('"balance" - ?', amount) }, ['balance', 'bonusBalance', 'reservedBalance'])
      .where('id', playerId),
    bonusAmount > 0 ? tx('player_bonuses')
      .update({ balance: pg.raw('"balance" - ?', bonusAmount) })
      .where({ id: playerBonusId, status: 'active' }) : 0,
  ]);

  if (bonusAmount > 0 && bonusUpdates === 0) {
    throw new Error('Unable to debit bonus money when bonus is not active');
  }
  const [{ id: transactionId }] = await tx('transactions')
    .insert({
      playerId,
      type,
      amount,
      bonusAmount,
      playerBonusId,
      gameRoundId,
      balance,
      bonusBalance,
      reservedBalance,
      manufacturerId,
      externalTransactionId,
      subTransactionId,
      targetTransactionId,
      timestamp: pg.raw('now()')
    })
    .returning('id');
  return transactionId;
};

export type Transaction = {
  transactionId: Id,
  date: Date,
  type: TxType,
  amount: Money,
  bonusAmount: Money,
  realBalance: Money,
  bonusBalance: Money,
  reservedBalance: Money,
  roundId: Id,
  externalRoundId: string,
  closed: boolean,
  externalTransactionId: string,
  bonus: string,
  description: string,
};

const getTransactionDates = (playerId: Id): Knex$QueryBuilder<Date[]> =>
  pg('report_hourly_players').select(pg.raw(`distinct date_trunc('day', hour) as day`)).where({ playerId });

const getTransactions = (
  playerId: Id,
  filter: { startDate: Date, endDate: Date, text?: string },
  paging?: { pageIndex: number, pageSize: number },
  sorting?: { sortBy: 'id' | 'date' | 'name', sortDirection: Knex$OrderByDirection },
): Knex$QueryBuilder<Transaction[]> =>
  pg('transactions')
    .select(
      'transactions.id as transactionId',
      'transactions.timestamp as date',
      'type',
      'transactions.amount',
      'transactions.bonusAmount',
      'transactions.balance as realBalance',
      'bonusBalance',
      'reservedBalance',
      'game_rounds.id as roundId',
      'game_rounds.externalGameRoundId as externalRoundId',
      'game_rounds.closed',
      'transactions.externalTransactionId as externalTransactionId',
      'bonuses.name as bonus',
      pg.raw(`
        case
          when "games"."name" is not null then "games"."name"
          when "payment_methods"."name" is not null then concat_ws('/', "payment_methods"."name", "payment_providers"."name")
        end as description
      `),
    )
    .leftOuterJoin('payments', 'payments.transactionId', 'transactions.id')
    .leftOuterJoin('game_rounds', (qb) =>
      qb
        .on('game_rounds.id', 'transactions.gameRoundId')
        .on(
          'game_rounds.timestamp',
          'between',
          pg.raw(
            `'${moment(filter.startDate).startOf('month').toISOString()}' and '${moment(
              filter.endDate,
            )
              .add(1, 'month')
              .endOf('month')
              .toISOString()}'`,
          ),
        ),
    )
    .leftOuterJoin('games', 'games.id', 'game_rounds.gameId')
    .leftOuterJoin('payment_methods', 'payment_methods.id', 'payments.paymentMethodId')
    .leftOuterJoin('payment_providers', 'payment_providers.id', 'payments.paymentProviderId')
    .leftOuterJoin('player_bonuses', 'player_bonuses.id', 'transactions.playerBonusId')
    .leftOuterJoin('bonuses', 'bonuses.id', 'player_bonuses.bonusId')
    .where({ 'transactions.playerId': playerId })
    .whereRaw(
      `transactions.timestamp between '${moment(filter.startDate)
        .startOf('day')
        .toISOString()}' and '${moment(filter.endDate).endOf('day').toISOString()}'`,
    )
    .modify((qb) => {
      const sortBy = sorting?.sortBy || 'id';
      const sortDirection = sorting?.sortDirection || 'DESC';
      const sortByColumnMap = {
        name: 'bonuses.name',
        date: 'transactions.timestamp',
        id: 'transactions.id',
      };
      qb.orderBy(sortByColumnMap[sortBy] || sortByColumnMap.id, sortDirection);

      if (filter.text) {
        const { text } = filter;
        const rawText = text.replace(/[.,\s]/g, '');
        const asText = (c: mixed, t: string) => [pg.raw(`??::text`, c), `%${t}%`];
        const anyILike = (qb: Knex$QueryBuilder<any>, args: Array<[mixed, string]>) =>
          _.reduce(
            _.tail(args),
            (qb, a) => qb.orWhereILike(...asText(...a)),
            qb.whereILike(...asText(..._.head(args))),
          );

        qb.where((qb) =>
          anyILike(qb, [
            ['transactions.id', text],
            ['transactions.type', text],
            ['transactions.externalTransactionId', text],
            ['transactions.amount', rawText],
            ['transactions.bonusAmount', rawText],
            ['transactions.balance', rawText],
            ['game_rounds.externalGameRoundId', text],
            ['bonuses.name', text],
            [
              pg.raw(`
                case
                  when "games"."name" is not null
                    then "games"."name"
                  when "payment_methods"."name" is not null
                    then concat_ws('/', "payment_methods"."name", "payment_providers"."name")
                end
              `),
              text,
            ],
          ]),
        );
      }

      if (paging) {
        qb.limit(paging.pageSize);
        qb.offset(paging.pageSize * paging.pageIndex);
      }
    });

const getTransactionsCount = async (knex: Knex, playerId: Id): Promise<number> => {
  const [{ transactionsCount }] = await knex('transactions')
    .select(knex.raw('count(*) as "transactionsCount"'))
    .where({ playerId });

  return Number(transactionsCount);
};

const getSummary = async (
  playerId: Id,
  startDate: Date,
  endDate: Date,
): Promise<TransactionSummary[]> => {
  const fromDate = moment(startDate).startOf('day').toISOString();
  const toDate = moment(endDate).endOf('day').toISOString();
  return await pg
    .with('trx', (qb) =>
      qb
        .select('gameRoundId', 'amount', 'bonusAmount', 'type')
        .from('transactions')
        .whereBetween('timestamp', [fromDate, toDate])
        .where('playerId', playerId)
        .whereIn('type', ['bet', 'win']),
    )
    .with('grnds', (qb) =>
      qb
        .select('id', 'gameId', 'manufacturerId')
        .from('game_rounds')
        .whereBetween('timestamp', [fromDate, toDate]),
    )
    .with('bets', (qb) =>
      qb
        .select({
          gameId: 'grnds.gameId',
          manufacturerId: 'grnds.manufacturerId',
          averageBet: pg.raw('percentile_disc(0.5) WITHIN GROUP (ORDER BY ??)', ['trx.amount']),
        })
        .sum({
          realBets: 'trx.amount',
          bonusBets: 'trx.bonusAmount',
        })
        .count({
          betCount: 'trx.*',
        })
        .from('trx')
        .join('grnds', 'grnds.id', 'trx.gameRoundId')
        .where('trx.type', 'bet')
        .groupBy('grnds.gameId', 'grnds.manufacturerId'),
    )
    .with('wins', (qb) =>
      qb
        .select({
          gameId: 'grnds.gameId',
        })
        .sum({
          realWins: 'trx.amount',
          bonusWins: 'trx.bonusAmount',
        })
        .max({
          biggestWin: pg.raw('?? + ??', ['trx.amount', 'trx.bonusAmount']),
        })
        .from('trx')
        .join('grnds', 'grnds.id', 'trx.gameRoundId')
        .where('trx.type', 'win')
        .groupBy('grnds.gameId'),
    )
    .select({
      name: 'games.name',
      manufacturer: 'game_manufacturers.name',
      realBets: 'bets.realBets',
      bonusBets: 'bets.bonusBets',
      realWins: 'wins.realWins',
      bonusWins: 'wins.bonusWins',
      betCount: 'bets.betCount',
      averageBet: 'bets.averageBet',
      biggestWin: 'wins.biggestWin',
    })
    .from('bets')
    .join('wins', 'wins.gameId', 'bets.gameId')
    .join('games', 'games.id', 'bets.gameId')
    .join('game_manufacturers', 'game_manufacturers.id', 'bets.manufacturerId')
    .orderBy(pg.raw('?? + ??', ['wins.realWins', 'wins.bonusWins']), 'desc');
};

const cancelTransaction = async (id: Id, cancelTransactionId: ?string, tx: Knex): Promise<?Id> => {
  const orig = await tx('transactions')
    .first(
      'id',
      'playerId',
      'type',
      'playerBonusId',
      'amount',
      'bonusAmount',
      'gameRoundId',
      'manufacturerId',
      'externalTransactionId',
      'subTransactionId',
      'timestamp'
    )
    .where({ id })
    .orderBy('timestamp', 'desc');
  if (orig) {
    logger.info(`+++ cancelTransaction orig`, { orig });
    try {
      // TODO: reqd after CR383 migration, see if we can do away with this part
      const existingByExternalId = await tx('transactions')
        .first('id')
        .where({
          playerId: orig.playerId,
          manufacturerId: orig.manufacturerId,
          externalTransactionId: cancelTransactionId || orig.externalTransactionId,
          subTransactionId: orig.subTransactionId | 0x80, // eslint-disable-line no-bitwise
        })
        .whereNot({
          manufacturerId: null,
          externalTransactionId: 'migrated',
        });
      if (existingByExternalId) return null;
      logger.info(`+++ cancelTransaction existingByExternalId`, { existingByExternalId });

      const existingByTransactionId = await tx('transactions')
        .first('id')
        .where({ targetTransactionId: orig.id })
        .whereBetween('timestamp', [orig.timestamp, pg.raw('now()')]);
      if (existingByTransactionId) return Promise.reject(errors.CANCEL_FAILED);
      logger.info(`+++ cancelTransaction existingByTransactionId`, { existingByTransactionId })
      // TODO: end of CR383 migration reqd part

      if (orig.type === 'wallet_withdrawal') {
        const body = {
          playerBonusId: orig.playerBonusId,
          amount: orig.amount,
          type: 'wallet_cancel_withdrawal',
          gameRoundId: orig.gameRoundId,
          externalTransactionId: cancelTransactionId || orig.externalTransactionId,
          targetTransactionId: orig.id,
        }
        return await creditReservedRealMoneyTransaction(orig.playerId, body, tx);
      }
      const bonusCount = orig.playerBonusId != null ? await pg('player_bonuses').where({ id: orig.playerBonusId, status: 'active' }).count('id').then(([{ count }]) => Number(count)) : 0;
      const amount = bonusCount === 0 ? orig.amount + orig.bonusAmount : orig.amount;
      const bonusAmount = bonusCount === 0 ? 0 : orig.bonusAmount;
      if (orig.type === 'bet') {
        return await creditTransaction(orig.playerId, {
          playerBonusId: orig.playerBonusId,
          amount,
          bonusAmount,
          type: 'cancel_bet',
          gameRoundId: orig.gameRoundId,
          manufacturerId: orig.manufacturerId,
          externalTransactionId: cancelTransactionId || orig.externalTransactionId,
          subTransactionId: orig.subTransactionId | 0x80, // eslint-disable-line no-bitwise
          targetTransactionId: orig.id,
        }, tx);
      }

      if (orig.type === 'win' || orig.type === 'win_jackpot' || orig.type === 'win_local_jackpot' || orig.type === 'win_freespins') { // TODO how to properly cancel jackpots?
        return await debitTransaction(orig.playerId, {
          playerBonusId: orig.playerBonusId,
          amount,
          bonusAmount,
          type: 'cancel_win',
          gameRoundId: orig.gameRoundId,
          manufacturerId: orig.manufacturerId,
          externalTransactionId: cancelTransactionId || orig.externalTransactionId,
          subTransactionId: orig.subTransactionId | 0x80, // eslint-disable-line no-bitwise
          targetTransactionId: orig.id,
        }, tx);
      }
      throw new Error(`Unable to cancel transaction of type ${orig.type}`);
    } catch (e) {
      if (e && e.constraint && e.constraint.match(/transactions_([0-9]+)_playerId_manufacturerId_externalTransaction?_idx/)) {
        return null;
      }
      if (e && e.constraint && e.constraint.match(/transactions_([0-9]+)_targetTransactionId_month_idx/)) {
        return Promise.reject(errors.CANCEL_FAILED);
      }
      if (e && e.constraint && e.constraint.match(/transactions_([0-9]+)_targetTransactionId_must_be_unique/)) {
        return null;
      }
      throw e;
    }
  }
  return null;
};

module.exports = {
  creditRealMoneyTransaction,
  creditBonusTransaction,
  creditTransaction,
  debitTransaction,
  debitBonusTransaction,
  turnBonusToRealTransaction,
  getTransactions,
  getTransactionDates,
  getTransactionsCount,
  getSummary,
  debitReservedMoneyTransaction,
  debitReservedRealMoneyTransaction,
  creditReservedRealMoneyTransaction,
  cancelTransaction,
};
