/* @flow */
 
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');

const report = async (brandId: ?string): Promise<any> => {
  const query = pg('payments')
    .select(
      'timestamp',
      'payment_methods.name as paymentMethod',
      'currencyId',
      'amount',
      'status',
      'players.firstName',
      'players.lastName',
      'players.countryId',
      'players.username',
      'accounts.account',
    )
    .innerJoin('players', 'payments.playerId', 'players.id')
    .innerJoin('accounts', 'payments.accountId', 'accounts.id')
    .innerJoin('payment_methods', 'payments.paymentMethodId', 'payment_methods.id')
    .where({ paymentType: 'withdraw' })
    .whereIn('status', ['pending', 'accepted', 'processing'])
    .orderBy('timestamp');
  if (brandId != null) {
    query.where('players.brandId', brandId);
  }
  const results = await query;
  return results.map(
    ({
      timestamp,
      account,
      paymentMethod,
      currencyId,
      amount,
      firstName,
      lastName,
      countryId,
      status,
      username,
    }) => ({
      timestamp,
      account,
      method: paymentMethod,
      currencyId,
      status,
      amount: formatMoney(amount, currencyId),
      rawAmount: amount,
      name: `${firstName} ${lastName}`,
      countryId,
      username,
    }),
  );
};

module.exports = { report };
