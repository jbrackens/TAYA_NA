/* @flow */
const pg = require('gstech-core/modules/pg');

module.exports = {
  getCurrencies: (brandId: string, includeDisabled: boolean = false): Promise<{ id: string, symbol: string, defaultConversion: number }[]> => {
    const filter = !includeDisabled ? { isActive: true } : {};
    return pg('currencies')
      .select('currencies.id', 'base_currencies.symbol', 'base_currencies.defaultConversion')
      .innerJoin('base_currencies', 'base_currencies.id', 'currencies.id')
      .where({ brandId })
      .where(filter);
  },
};
