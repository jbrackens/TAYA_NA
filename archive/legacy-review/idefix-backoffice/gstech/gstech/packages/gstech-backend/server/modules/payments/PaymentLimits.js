/* @flow */

const _ = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { depositLimitRemaining } = require('../limits');
const { getAccountStatus } = require('../players');

const getDepositsLeftAfterPending = (playerId: Id): Promise<{ paymentProviderId: Id, amount: Money }[]> =>
  pg('payments')
    .select('payments.paymentProviderId', pg.raw('min("maxPendingDeposits") - sum(amount) as amount'))
    .innerJoin('players', 'players.id', 'payments.playerId')
    .innerJoin('payment_provider_limits', {
      'payments.paymentProviderId': 'payment_provider_limits.paymentProviderId',
      'payment_provider_limits.brandId': 'players.brandId',
      'payment_provider_limits.currencyId': 'players.currencyId',
    })
    .where({
      playerId,
      paymentType: 'deposit',
      status: 'pending',
    })
    .whereNotNull('maxPendingDeposits')
    .groupBy('payments.paymentProviderId');

const validateDepositLimits = async (playerId: Id, paymentProviderId: Id, amount: Money): Promise<any> | Promise<boolean> => {
  const accessStatus = await getAccountStatus(playerId);
  if (!accessStatus.allowTransactions) {
    return Promise.reject({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
  }

  const depositLimit = await depositLimitRemaining(playerId);
  if (depositLimit < amount) {
    return Promise.reject({ error: errorCodes.DEPOSIT_TOO_HIGH });
  }

  const limit = await pg('payment_provider_limits')
    .first('minDeposit', 'maxDeposit')
    .innerJoin('players', {
      'payment_provider_limits.brandId': 'players.brandId',
      'payment_provider_limits.currencyId': 'players.currencyId',
    })
    .where({ paymentProviderId, 'players.id': playerId });

  if (limit === undefined) {
    logger.error('No payment limits found for paymentProviderId', paymentProviderId);
    return Promise.reject({ error: errorCodes.INVALID_DEPOSIT_ACCOUNT });
  }

  if (amount > limit.maxDeposit) {
    return Promise.reject({ error: errorCodes.DEPOSIT_TOO_HIGH });
  }

  if (limit.minDeposit > amount) {
    return Promise.reject({ error: errorCodes.DEPOSIT_TOO_LOW });
  }

  const pending = await getDepositsLeftAfterPending(playerId);
  const pendingLimit = _.find(pending, x => x.paymentProviderId === paymentProviderId);
  if (pendingLimit != null) {
    if (pendingLimit.amount < amount) {
      return Promise.reject({ error: errorCodes.DEPOSIT_TOO_HIGH });
    }
  }

  return true;
};

module.exports = { validateDepositLimits, getDepositsLeftAfterPending };
