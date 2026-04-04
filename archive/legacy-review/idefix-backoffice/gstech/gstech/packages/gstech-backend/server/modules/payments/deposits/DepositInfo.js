/* @flow */
const pg = require('gstech-core/modules/pg');

export type DepositInfo = {
  accountId: Id,
  paymentMethodId: Id,
  paymentProviderId: Id,
  account: string,
  method: string,
  withdrawals: boolean,
};

const getPreviousDeposit = (playerId: Id): Knex$QueryBuilder<DepositInfo> =>
  pg('payments')
    .first('accountId', 'payments.paymentMethodId', 'payments.paymentProviderId', pg.raw('(payment_providers.withdrawals AND accounts.withdrawals) AS withdrawals'), 'account', 'payment_methods.name as method')
    .innerJoin('accounts', 'accounts.id', 'payments.accountId')
    .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
    .innerJoin('payment_providers', 'payments.paymentProviderId', 'payment_providers.id')
    .where({ 'payments.playerId': playerId, paymentType: 'deposit' })
    .whereIn('status', ['pending', 'complete'])
    .orderBy('timestamp', 'desc');


module.exports = { getPreviousDeposit };
