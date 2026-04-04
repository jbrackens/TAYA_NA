/* @flow */
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const find = require('lodash/fp/find');

const currencyConversion =
  (conversionRates: ConversionRate[]): ((amount: Money, currencyId: string) => Money | number) =>
  (amount: Money, currencyId: string) => {
    if (amount == null) throw Error('Convert amount failed');
    const rate = find<any>((row) => row.currencyId === currencyId)(conversionRates);
    if (rate) {
      if (rate.conversionRate !== 1) return amount / rate.conversionRate;
      return amount;
    }
    if (currencyId !== 'EUR') throw Error(`No conversion rate for ${currencyId}`);
    return amount;
  };

module.exports = { currencyConversion };
