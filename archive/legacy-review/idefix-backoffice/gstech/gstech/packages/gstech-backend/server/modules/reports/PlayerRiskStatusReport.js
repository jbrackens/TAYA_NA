/* @flow */
const pg = require('gstech-core/modules/pg');

const report = async (brandId: ?string): Promise<any> => {
  const query = pg('players')
    .select(
      'players.username',
      'players.firstName',
      'players.lastName',
      'players.countryId',
      'players.email',
      'players.riskProfile',
      pg.raw('("depositLimitReached" is not null) as flagged'),
      pg.raw('(("depositLimitReached" + \'30 days\'::interval) < now()) as locked'),
      pg.raw('("depositLimitReached" + \'30 days\'::interval) as "lockTime"'),
    )
    .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
    .where('players.verified', false)
    .whereNotNull('depositLimitReached')
    .groupBy('players.id')
    .orderBy('depositLimitReached');

  if (brandId != null) {
    query.where({ brandId });
  }
  const result = await query;
  return result;
};
module.exports = { report };
