/* @flow */
import type { PaymentStatus, PaymentType } from 'gstech-core/modules/types/backend';
import type { QueryForPaymentsRequest } from 'gstech-core/modules/clients/backend-payment-api';

const _ = require('lodash');
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const transactions = require('../transactions');
const { addEvent } = require('../players/PlayerEvent');
const { emitSidebarStatusChanged } = require('../core/socket');

const addPaymentEvent = async (
  playerId: Id,
  type: PaymentType,
  paymentId: Id,
  userId: ?Id,
  amount: ?Money,
  status: PaymentStatus,
  message: ?string,
  rawTransaction: ?mixed,
  transactionId: ?Id,
  tx: Knex) => {
  await tx('payment_event_logs').insert({ paymentId, userId, rawTransaction, status, message, transactionId });
  if (type === 'withdraw') {
    if (status === 'accepted') {
      await addEvent(playerId, userId, 'transaction', 'acceptWithdrawal', { amount, message }).transacting(tx);
    } else if (status === 'cancelled' && userId !== null) {
      await addEvent(playerId, userId, 'transaction', 'cancelWithdrawal', { amount, message }).transacting(tx);
    } else if (status === 'failed') {
      await addEvent(playerId, userId, 'transaction', 'failedWithdrawal', { amount, message }).transacting(tx);
    }
    emitSidebarStatusChanged();
  } else if (type === 'compensation') {
    await addEvent(playerId, userId, 'transaction', 'addCompensation', { amount, message }).transacting(tx);
  } else if (type === 'correction') {
    await addEvent(playerId, userId, 'transaction', 'addCorrection', { amount, message }).transacting(tx);
  }
};
export type Payment = {
  paymentId: Id,
  timestamp: Date,
  externalTransactionId: string,
  amount: Money,
  paymentFee: ?Money,
  name: string,
  bonus: string,
  account: string,
  counterTarget: ?Money,
  counterValue: Money,
  counterId: ?Id,
  campaignTarget: Money,
  campaignValue: Money,
  campaignId: ?Id,
  transactionId: Id,
  transactionKey: UUID,
  paymentType: PaymentType,
  status: PaymentStatus,
  paymentMethod: string
};

const payments = (
  playerId: Id,
  paging?: { pageIndex: number, pageSize: number },
  status?: PaymentStatus[],
  filter?: { from?: Date, to?: Date, text?: string },
  sorting?: { sortBy: 'id' | 'date' | 'name', sortDirection: Knex$OrderByDirection },
): Knex$QueryBuilder<Payment[]> =>
  pg('payments')
    .select(
      'payments.id as paymentId',
      'payments.timestamp',
      'payments.amount',
      'payments.paymentFee',
      'paymentType',
      'transactionKey',
      'bonuses.name as bonus',
      'payment_methods.name as paymentMethod',
      'payment_providers.name as name',
      pg.raw("coalesce(nullif(accounts.account, ''), accounts.\"accountHolder\", '') as account"),
      'externalTransactionId',
      'transactionKey',
      'payments.transactionId',
      'payments.status',
      'player_counters.limit as counterTarget',
      'player_counters.amount as counterValue',
      'player_counters.id as counterId',
      'campaign_counters.limit as campaignTarget',
      'campaign_counters.amount as campaignValue',
      'campaign_counters.id as campaignId',
    )
    .leftOuterJoin('payment_methods', 'payment_methods.id', 'payments.paymentMethodId')
    .leftOuterJoin('payment_providers', 'payment_providers.id', 'payments.paymentProviderId')
    .leftOuterJoin('player_counters', (qb) =>
      qb
        .on('player_counters.paymentId', 'payments.id')
        .on('player_counters.type', pg.raw('?', 'deposit_wager'))
        .on('player_counters.active', pg.raw('?', true))
        .on('player_counters.amount', '<', 'player_counters.limit')
        .on('player_counters.playerId', pg.raw('?', playerId)),
    )
    .leftOuterJoin('player_counters as campaign_counters', (qb) =>
      qb
        .on('campaign_counters.paymentId', 'payments.id')
        .on('campaign_counters.type', pg.raw('?', 'deposit_campaign'))
        .on('campaign_counters.active', pg.raw('?', true))
        .on('campaign_counters.amount', '<', 'campaign_counters.limit')
        .on('campaign_counters.playerId', pg.raw('?', playerId)),
    )
    .leftOuterJoin('accounts', {
      'accounts.id': 'payments.accountId',
      'accounts.playerId': pg.raw('?', playerId),
    })
    .leftOuterJoin('bonuses', 'bonuses.id', 'payments.bonusId')
    .where({ 'payments.playerId': playerId })
    .modify((qb) => {
      const sortBy = sorting?.sortBy || 'id';
      const sortDirection = sorting?.sortDirection || 'DESC';
      const sortByColumnMap = {
        name: 'bonuses.name',
        date: 'payments.timestamp',
        id: 'payments.id',
      };
      qb.orderBy(sortByColumnMap[sortBy] || sortByColumnMap.id, sortDirection);

      if (status) qb.whereIn('payments.status', status);
      if (filter) {
        if (filter.from) qb.where('timestamp', '>=', filter.from);
        if (filter.to) qb.where('timestamp', '<', filter.to);
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
              ['payments.id', text],
              ['payments.externalTransactionId', text],
              ['payments.status', text],
              ['payments.amount', rawText],
              ['payments.paymentFee', rawText],
              ['payments.paymentType', text],
              ['payment_methods.name', text],
              ['payment_providers.name', text],
              ['bonuses.name', text],
              [
                pg.raw(
                  `coalesce(nullif("accounts"."account", ''), "accounts"."accountHolder", '')`,
                ),
                text,
              ],
            ]),
          );
        }
      }

      if (paging) {
        qb.limit(paging.pageSize);
        qb.offset(paging.pageSize * paging.pageIndex);
      }
    });

const paymentEvents = (playerId: Id, paymentId: Id): Promise<{ }[]> =>
  pg('payments')
    .select(
      'payment_event_logs.timestamp',
      'payment_event_logs.status',
      'payment_event_logs.message',
      'users.handle',
    )
    .innerJoin('payment_event_logs', 'payment_event_logs.paymentId', 'payments.id')
    .leftOuterJoin('users', 'users.id', 'payment_event_logs.userId')
    .where({ 'payments.playerId': playerId, 'payments.id': paymentId })
    .orderBy('payment_event_logs.timestamp');

const statement = (playerId: Id, items: number = 100, page: number = 0): Promise<{ account: string, paymentMethod: string, paymentType: PaymentType }[]> =>
  pg('payments')
    .select('timestamp', 'amount', 'paymentType', 'payment_methods.name as paymentMethod', 'accounts.account', 'externalTransactionId', 'transactionKey')
    .leftOuterJoin('payment_methods', 'payment_methods.id', 'payments.paymentMethodId')
    .leftOuterJoin('accounts', 'accounts.id', 'payments.accountId')
    .where({ 'payments.playerId': playerId })
    .whereRaw('(("paymentType" = \'deposit\' and status in (\'pending\', \'complete\')) or ("paymentType" = \'withdraw\' and status in (\'accepted\', \'complete\')))')
    .orderBy('timestamp', 'desc')
    .limit(items)
    .offset(page * items);

const deposits = (playerId: Id, items: number = 100, page: number = 0): any =>
  pg('payments')
    .select(
      'timestamp',
      'amount',
      pg.raw('(amount / base_currencies."defaultConversion") as value'),
      'index',
    )
    .join('players', 'payments.playerId', 'players.id')
    .join('base_currencies', 'base_currencies.id', 'players.currencyId')
    .where({ 'payments.playerId': playerId })
    .whereRaw('("paymentType" = \'deposit\' and status in (\'pending\', \'complete\'))')
    .orderBy('timestamp', 'desc')
    .limit(items)
    .offset(page * items);


const getPaymentInfo = async (playerId: Id): Promise<
  {
    depositCount: number,
    totalDepositAmount: any,
    totalWithdrawalAmount: any,
    withdrawalCount: number,
  },
> => {
  const [[{ totalDepositAmount, depositCount }], [{ totalWithdrawalAmount, withdrawalCount }]] = await pg.transaction(tx =>
    Promise.all([
      tx('payments').sum('amount as totalDepositAmount')
        .count('id as depositCount')
        .where({ playerId, paymentType: 'deposit' })
        .whereIn('status', ['complete', 'accepted']),
      tx('payments')
        .sum('amount as totalWithdrawalAmount')
        .count('id as withdrawalCount')
        .where({ playerId, status: 'complete', paymentType: 'withdraw' })
        .whereIn('status', ['accepted', 'processing', 'complete']),
    ]));
  return {
    totalDepositAmount: totalDepositAmount || 0,
    totalWithdrawalAmount: totalWithdrawalAmount || 0,
    depositCount: Number(depositCount),
    withdrawalCount: Number(withdrawalCount),
  };
};

const getPaymentSummary = async (playerId: Id): Promise<
  {
    bonusToReal: any,
    compensations: any,
    creditedBonusMoney: any,
    depositAmountInSixMonths: any,
    depositCountInSixMonths: number,
    freespins: any,
    withdrawalAmountInSixMonths: any,
    withdrawalCountInSixMonths: number,
  },
> => {
  const [
    [{ depositAmountInSixMonths, depositCountInSixMonths }],
    [{ withdrawalAmountInSixMonths, withdrawalCountInSixMonths }],
    [{ compensations }],
    rows,
  ] = await pg.transaction(tx => Promise.all([
    tx('payments').sum('amount as depositAmountInSixMonths')
      .count('id as depositCountInSixMonths')
      .where({ playerId, paymentType: 'deposit' })
      .whereIn('status', ['complete', 'accepted'])
      .where(pg.raw('timestamp > now() - \'6 months\'::interval')),
    tx('payments')
      .sum('amount as withdrawalAmountInSixMonths')
      .count('id as withdrawalCountInSixMonths')
      .where({ playerId, status: 'complete', paymentType: 'withdraw' })
      .whereIn('status', ['accepted', 'processing', 'complete'])
      .where(pg.raw('timestamp > now() - \'6 months\'::interval')),
    tx('payments')
      .sum('amount as compensations')
      .where({ playerId, paymentType: 'compensation' }),
    tx('report_hourly_players')
      .select('type')
      .sum('amount as amount')
      .sum('bonusAmount as bonusAmount')
      .groupBy('type')
      .where({ playerId })
      .whereIn('type', ['turn_bonus_to_real', 'win_freespins', 'bonus_credit']),
  ]));

  return {
    depositCountInSixMonths: Number(depositCountInSixMonths),
    depositAmountInSixMonths,
    withdrawalCountInSixMonths: Number(withdrawalCountInSixMonths),
    withdrawalAmountInSixMonths,
    creditedBonusMoney: _.first(rows.filter(x => x.type === 'bonus_credit').map(x => x.bonusAmount)) || 0,
    bonusToReal: _.first(rows.filter(x => x.type === 'turn_bonus_to_real').map(x => x.amount)) || 0,
    freespins: _.first(rows.filter(x => x.type === 'win_freespins').map(x => x.amount + x.bonusAmount)) || 0,
    compensations,
  };
};

const queryForPayments = async ({
  startDate,
  endDate,
  paymentType,
  paymentStatus,
  psp,
  parameters,
}: QueryForPaymentsRequest): Promise<Payment[]> =>
  pg('payments')
    .select('payments.id', 'payments.transactionKey')
    .modify(qb => {
      if (startDate) qb.where('timestamp', '>=', startDate);
      if (endDate) qb.where('timestamp', '<=', endDate);
      if (paymentType) qb.where({ paymentType });
      if (paymentStatus) qb.where({ status: paymentStatus });
      if (psp) qb
        .join('payment_providers', 'payment_providers.id', 'payments.paymentProviderId')
        .join('payment_methods', 'payment_methods.id', 'payments.paymentMethodId')
        .where({
          'payment_providers.name': psp.provider,
          'payment_methods.name': psp.method,
        });
      if (parameters) qb.whereJsonSupersetOf('parameters', parameters);;
    })

const addTransaction = async (
  playerId: Id,
  sessionId: ?Id,
  paymentType: 'correction' | 'compensation',
  amount: Money,
  message: string,
  userId: ?Id,
  tx: Knex,
): Promise<string> => {
  const transactionKey = uuid();
  if (paymentType === 'correction') {
    const transactionId = await transactions.createCorrection(playerId, { amount }, tx);
    const [{ id: paymentId }] = await tx('payments')
      .insert({
        transactionKey,
        transactionId,
        playerId,
        amount,
        paymentType,
        status: 'complete',
        sessionId,
      })
      .returning('id');
    await addPaymentEvent(
      playerId,
      paymentType,
      paymentId,
      userId,
      amount,
      'complete',
      message,
      null,
      transactionId,
      tx,
    );
  } else if (paymentType === 'compensation' && amount >= 0) {
    // eslint-disable-next-line no-use-before-define
    await Bonus.doMaintenance(playerId, (tx: any));
    const transactionId = await transactions.createCompensation(playerId, { amount }, tx);
    const [{ id: paymentId }] = await tx('payments')
      .insert({
        transactionKey,
        transactionId,
        playerId,
        amount,
        paymentType,
        status: 'complete',
        sessionId,
      })
      .returning('id');
    await addPaymentEvent(
      playerId,
      paymentType,
      paymentId,
      userId,
      amount,
      'complete',
      message,
      null,
      transactionId,
      tx,
    );
  } else {
    throw Error('Invalid transaction');
  }
  return transactionKey;
};

const getPaymentEvents = (transactionKey: UUID): Promise<{ }[]> =>
  pg('payment_event_logs')
    .select('handle', 'payment_event_logs.status', 'payment_event_logs.timestamp', 'message', 'userId')
    .innerJoin('payments', 'payments.id', 'payment_event_logs.paymentId')
    .leftOuterJoin('users', 'users.id', 'payment_event_logs.userId')
    .where({ transactionKey })
    .orderBy('payment_event_logs.timestamp');

module.exports = {
  statement,
  deposits,
  getPaymentInfo,
  addTransaction,
  addPaymentEvent,
  getPaymentEvents,
  payments,
  paymentEvents,
  getPaymentSummary,
  queryForPayments,
};

// Cyclic dependency
const Bonus = require('../bonuses');