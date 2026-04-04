/* @flow */
const moment = require('moment-timezone');
const { promisify } = require('util');
const keys = require('lodash/keys');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const redis = require('gstech-core/modules/redis');
const { MANUFACTURER_ID } = require('./constants');
const pragmatic = require('./PragmaticAPI');
const config = require('../../../config');

const configuration = config.providers.pragmatic;
const TS_KEY = 'pragmatic-timestamp';
const client = redis.createClient();
const get = promisify(client.get.bind(client));
const set = promisify(client.set.bind(client));

const closeRounds = async (brand: BrandId, brandConfig: any) => {
  let ts = await get(`${TS_KEY}:${brand}`);
  logger.debug('>>> Pragmatic CLOSEROUNDS', { brand, ts });
  if (isNaN(Number(ts))) {
    logger.error('Invalid pragmatic job date, starting from 1 month back', { ts });
    ts = moment().subtract(1, 'month').toDate().getTime();
  }
  try {
    const { data, timestamp } = await pragmatic.getRoundsToClose(brandConfig.secureLogin, brandConfig.secretKey, ts);
    logger.debug('>>> Pragmatic CLOSEROUNDS [rounds to close]', { count: data.length, timestamp });
    for (const item of data) {
      logger.debug('>>> Pragmatic CLOSEROUNDS [closing round]', { item });
      const player = await api.getPlayerId(item.extPlayerID);
      if (player != null) {
        const { brandId, playerId } = player;
        const closeReq = {
          brandId,
          manufacturer: MANUFACTURER_ID,
          gameRoundId: item.playSessionID,
          timestamp: moment.tz(item.timestamp, 'GMT'),
        };
        try {
          await api.closeRound(playerId, closeReq);
        } catch (e) {
          logger.warn('XXX Pragmatic CLOSEROUNDS [closing round failed]', { closeReq, error: e.error });
        }
      }
    }
    if (timestamp != null && !isNaN(Number(timestamp))) {
      logger.debug(`<<< Pragmatic CLOSEROUNDS [done]`, { key: `${TS_KEY}:${brand}`, timestamp });
      await set(`${TS_KEY}:${brand}`, timestamp);
    }
  } catch (e) {
    logger.error('XXX Pragmatic CLOSEROUNDS', { error: e.error });
  }
};

const closeRoundsJob = (): Promise<$TupleMap<Array<Promise<void>>, <T>(p: Promise<T> | T) => T>> => Promise.all(keys(configuration.brands).map(async (brandId: BrandId) => {
  const germanBrandConfig = configuration.germanBrands[brandId];
  await closeRounds(brandId, configuration.brands[brandId]);

  // $FlowFixMe
  if (germanBrandConfig && germanBrandConfig[brandId] != null) {
    await closeRounds(brandId, germanBrandConfig);
  }
}));

module.exports = {
  closeRoundsJob,
};
