/* @flow */
const Redis = require('ioredis');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const create = (): any => {
  const conn =
    config.redis.length > 1
      ? // slotsRefreshInterval to keep same v4 behavior - https://github.com/luin/ioredis/wiki/Upgrading-from-v4-to-v5
        new Redis.Cluster(config.redis, {
          maxRetriesPerRequest: null, // reqd for bull 4+
          enableReadyCheck: false, // reqd for bull 4+
          slotsRefreshInterval: 5000,
        })
      : new Redis(config.redis[0]);
  conn.on('error', (e) => logger.error('Redis error', e));
  return conn;
};

module.exports = { create };
