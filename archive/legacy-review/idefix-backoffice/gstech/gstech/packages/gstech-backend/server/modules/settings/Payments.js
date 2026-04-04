 
/* @flow */
const pg = require('gstech-core/modules/pg');

module.exports = {
  getPaymentProviders: (): Promise<{ name: string, }[]> =>
    pg('payment_providers')
      .select(pg.raw('distinct payment_providers.name as name'))
      .orderBy('payment_providers.name'),
};
