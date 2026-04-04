/* @flow */
/* eslint-disable default-param-last */
const _ = require('lodash');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { formatMoney } = require('../core/money');

type WithdrawReportSortableHeaders =
  | 'timestamp'
  | 'id'
  | 'externalTransactionId'
  | 'method'
  | 'account'
  | 'currencyId'
  | 'amount'
  | 'name'
  | 'status'
  | 'username'
  | 'countryId'
  | 'handle';
const report = async (
  month: Date,
  {
    brandId = null,
    paymentProviderName = null,
    text = null,
  }: { brandId?: ?string, paymentProviderName?: ?string, text?: ?string } = {},
  paging?: {
    pageSize: number,
    pageIndex: number,
  },
  sorting?: { sortBy: WithdrawReportSortableHeaders, sortDirection: Knex$OrderByDirection },
): Promise<any> => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const query = pg
    .with('records', (qb) =>
      qb
        .select(
          pg.raw('distinct on(payments.id) payments.id'),
          'payment_event_logs.timestamp',
          'payments.transactionKey',
          'externalTransactionId',
          'payment_methods.name as paymentMethod',
          'payment_providers.name as paymentProvider',
          'currencyId',
          'amount',
          'players.firstName',
          'players.lastName',
          'players.countryId',
          'players.username',
          'users.handle',
          'accounts.account',
        )
        .from('payments')
        .innerJoin('players', 'payments.playerId', 'players.id')
        .innerJoin('accounts', 'payments.accountId', 'accounts.id')
        .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
        .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
        .innerJoin('payment_event_logs', {
          'payment_event_logs.paymentId': 'payments.id',
          'payment_event_logs.transactionId': 'payments.transactionId',
          'payment_event_logs.status': pg.raw('?', 'complete'),
        })
        .leftOuterJoin('payment_event_logs as accepted', {
          'accepted.paymentId': 'payments.id',
          'accepted.status': pg.raw('?', 'accepted'),
        })
        .leftOuterJoin('users', 'accepted.userId', 'users.id')
        .modify((qb) => {
          if (paymentProviderName) qb.where('payment_providers.name', paymentProviderName);
          if (brandId != null) qb.where('players.brandId', brandId);
          if (text) {
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
                ['payments.externalTransactionId', text],
                ['payments.transactionKey', text],
                ['payments.amount', rawText],
                ['players.firstName', text],
                ['players.lastName', text],
                ['players.countryId', text],
                ['players.username', text],
                ['users.handle', text],
                ['accounts.account', text],
              ]),
            );
          }
          if (paging) qb.limit(paging.pageSize).offset(paging.pageSize * paging.pageIndex);
        })
        .where({ 'payments.status': 'complete', paymentType: 'withdraw' })
        .whereRaw(
          `date_trunc('month', payment_event_logs.timestamp AT TIME zone 'Europe/Rome')
            = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')`,
        )
        .orderBy('payments.id', 'desc'),
    )
    .select('*')
    .from('records')
    .modify((qb) => {
      const sortBy = sorting?.sortBy || 'id';
      const sortDirection = sorting?.sortDirection || 'DESC';
      const sortByColumnMap = {
        name: pg.raw(`concat("firstName", ' ', "lastName")`),
        method: pg.raw(`concat("paymentMethod", '/', "paymentProvider")`),
      };
      qb.orderBy(_.get(sortByColumnMap, sortBy, sortBy), sortDirection);
    });

  logger.debug('Withdraw report query', query.toString());
  const results = await query;
  logger.debug('Withdraw report results', results);
  return (results.data || results).map(
    ({
      timestamp,
      transactionKey,
      externalTransactionId,
      account,
      paymentMethod,
      paymentProvider,
      currencyId,
      amount,
      firstName,
      lastName,
      countryId,
      username,
      handle,
      id,
    }) => ({
      timestamp,
      transactionKey,
      externalTransactionId,
      account,
      method: [paymentMethod, paymentProvider].filter((x) => x != null).join('/'),
      currencyId,
      amount: formatMoney(amount, currencyId),
      rawAmount: amount,
      name: `${firstName} ${lastName}`,
      countryId,
      username,
      handle,
      id,
    }),
  );
};

module.exports = { report };
