/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const report = async (month: Date, brandId: ?string, riskProfile: ?('medium_low' | 'medium' | 'medium_high' | 'high')): Promise<any> => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const query = pg('players')
    .select(
      'players.username',
      'players.firstName',
      'players.lastName',
      'players.countryId',
      'players.email',
      'players.riskProfile',
      'payment_methods.name',
      'paymentType',
      pg.raw('sum(payments.amount/conversion_rates."conversionRate") as amount'),
      pg.raw('count(payments.id) as count'),
    )
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .innerJoin('payment_methods', 'payment_methods.id', 'payments.paymentMethodId')
    .innerJoin('conversion_rates', 'conversion_rates.currencyId', 'players.currencyId')
    .whereIn('payments.paymentType', ['deposit', 'withdraw'])
    .where('payments.status', 'complete')
    .whereRaw(`date_trunc('month', payments.timestamp AT TIME zone 'Europe/Rome') = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')`)
    .groupBy('players.id')
    .groupBy('payment_methods.id')
    .groupBy('payments.paymentType')
    .orderBy('players.id');

  if (brandId != null) {
    query.where({ brandId });
  }

  if (riskProfile != null) {
    query.where({ riskProfile });
  } else {
    query.whereIn('riskProfile', ['medium', 'high']);
  }
  const result = await query;
  return result;
};

module.exports = { report };
