/* @flow */

const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { axios } = require('gstech-core/modules/axios');

(async () => {
  const symbols = ['EUR', 'GBP', 'SEK', 'USD'].join(',');
  const { data } = await axios.request({
    url: `http://data.fixer.io/api/timeseries`,
    params: {
      access_key: '1f501cb62968c57decb00a89feb5d00a',
      format: 1,
      base: 'EUR',
      symbols,
      start_date: '2014-01-01',
      end_date: '2014-12-31',
    },
  });
  for (const [date, rates] of _.entries(data.rates)) {
    const dateRates = _.entries(rates).map(([currencyId, rate]) => ({
      timestamp: date,
      currencyId,
      conversionRate: _.round(rate, 6),
    }));
    for (const { timestamp, currencyId, conversionRate } of dateRates) {
      const rateExists = await pg('conversion_rate_histories')
        .select(['id', 'conversionRate'])
        .where({ timestamp, currencyId })
        .first();
      if (rateExists) {
        await pg('conversion_rate_histories')
          .update({ conversionRate })
          .where({ id: rateExists.id });
        logger.info(`Updated ${currencyId} conversion rates for ${date}`);
      } else {
        await pg('conversion_rate_histories').insert({ timestamp, currencyId, conversionRate });
        logger.info(`Inserted ${currencyId} conversion rates for ${date}`);
      }
    }
  }
  logger.info('Refreshing materialized views');
  await pg.raw('refresh materialized view conversion_rates');
  await pg.raw('refresh materialized view monthly_conversion_rates');
  logger.info('Done');
  process.exit(0);
})();
