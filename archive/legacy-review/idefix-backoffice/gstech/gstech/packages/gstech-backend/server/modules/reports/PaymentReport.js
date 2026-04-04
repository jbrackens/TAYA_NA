/* @flow */
/* eslint-disable default-param-last */
const _ = require('lodash');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');

export type PaymentReportType = 'deposit' | 'withdraw';
type PaymentReportSortableHeaders =
  | 'id'
  | 'timestamp'
  | 'externalTransactionId'
  | 'method'
  | 'account'
  | 'amount'
  | 'currencyId'
  | 'name'
  | 'username'
  | 'countryId'
  | 'transactionKey';

const report = async (
  paymentType: PaymentReportType,
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
  sorting?: { sortBy: PaymentReportSortableHeaders, sortDirection: Knex$OrderByDirection },
): Promise<any> => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const query = pg
    .with('records', (qb) =>
      qb
        .select(
          pg.raw('distinct on (payments.id) payments.id'),
          'payment_event_logs.timestamp',
          pg.raw(
            'COALESCE(settled_payment_event_logs.status, payment_event_logs.status) as status',
          ),
          'externalTransactionId',
          'transactionKey',
          'payment_methods.name as paymentMethod',
          'payment_providers.name as paymentProvider',
          'currencyId',
          'amount',
          'players.firstName',
          'players.lastName',
          'players.countryId',
          'players.username',
          'accounts.account',
        )
        .from('payments')
        .innerJoin('players', 'payments.playerId', 'players.id')
        .innerJoin('accounts', 'payments.accountId', 'accounts.id')
        .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
        .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
        .innerJoin('payment_event_logs', {
          'payment_event_logs.transactionId': 'payments.transactionId',
          'payment_event_logs.paymentId': 'payments.id',
        })
        .joinRaw(
          `left join payment_event_logs as settled_payment_event_logs on settled_payment_event_logs."paymentId" = payments.id
            and settled_payment_event_logs.status = 'settled'`,
        )
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
                ['accounts.account', text],
              ]),
            );
          }
          if (paging) qb.limit(paging.pageSize).offset(paging.pageSize * paging.pageIndex);
        })
        .where({ 'payments.status': 'complete', paymentType })
        .whereRaw(
          `payment_event_logs.timestamp between date_trunc('week', '${h}' AT TIME zone 'Europe/Rome')
          AND date_trunc('week', '${h}' AT TIME zone 'Europe/Rome') + '1 week'::INTERVAL - '1 usec'::INTERVAL`,
        )
        .orderByRaw('payments.id, payment_event_logs.timestamp desc'),
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
    }).debug();

  const results = await query;
  return (results.data || results).map(
    ({
      timestamp,
      status,
      externalTransactionId,
      transactionKey,
      account,
      paymentMethod,
      paymentProvider,
      currencyId,
      amount,
      firstName,
      lastName,
      countryId,
      username,
    }) => ({
      timestamp,
      status,
      externalTransactionId,
      transactionKey,
      account,
      method: [paymentMethod, paymentProvider].filter((x) => x != null).join('/'),
      currencyId,
      amount: formatMoney(amount, currencyId),
      rawAmount: amount,
      name: `${firstName} ${lastName}`,
      countryId,
      username,
    }),
  );
};

module.exports = { report };
