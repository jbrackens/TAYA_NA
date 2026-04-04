/* @flow */
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const { axios } = require('gstech-core/modules/axios');
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const update = async () => {
  const { data: rates } = await axios.request({
    url: 'http://data.fixer.io/api/latest?access_key=87b5be67a9feeaa6806c161bff82d4c8&format=1',
  });
  const currencies = await pg('currencies').select(pg.raw('distinct(id) as id')).whereNot('id', 'EUR');
  await Promise.all(currencies.map(currency =>
    pg('conversion_rate_histories').insert({ currencyId: currency.id, conversionRate: rates.rates[currency.id] })));
  await pg.raw('refresh materialized view conversion_rates');
  await pg.raw('refresh materialized view monthly_conversion_rates');
};

const getCurrentRates = async (): Promise<ConversionRate[]> => {
  const values = await pg('conversion_rates').select('currencyId', pg.raw('1000000 * "conversionRate" as "conversionRate"'));
  return values.map(({ currencyId, conversionRate }) => ({ currencyId, conversionRate: (conversionRate / 1000000) }));
};

const getMonthRates = async (month: Date): Promise<ConversionRate[]> => {
  const h = moment(month).format('YYYY-MM-01 00:00:00');
  const values = await pg('monthly_conversion_rates')
    .select('currencyId', pg.raw('1000000 * "conversionRate" as "conversionRate"'))
    .whereRaw(`date_trunc('month', month) = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')`);

  if (values === 0) {
    return getCurrentRates();
  }
  return values.map(({ currencyId, conversionRate }) => ({ currencyId, conversionRate: (conversionRate / 1000000) }));
};

const getAllMonthRates = async (): Promise<any> => {
  const values = await pg('monthly_conversion_rates')
    .select('currencyId', 'month', pg.raw('1000000 * "conversionRate" as "conversionRate"'));
  return values.map(({ currencyId, month, conversionRate }) => ({ currencyId, month, conversionRate: (conversionRate / 1000000) }));
};


module.exports = { update, getMonthRates, getCurrentRates, getAllMonthRates };
