/* @flow */
const Redis = require('ioredis');

const config = require('./config');
const logger = require('./logger');

const createClient = (defaultKeyPrefix: ?string = config.appName): any => {
  const options = {
    keyPrefix: defaultKeyPrefix,
    maxRetriesPerRequest: null, // reqd for bull 4+
    enableReadyCheck: false, // reqd for bull 4+
  };
  const conn =
    config.redis.length > 1
      ? // slotsRefreshInterval to keep same v4 behavior - https://github.com/luin/ioredis/wiki/Upgrading-from-v4-to-v5
        new Redis.Cluster(config.redis, { ...options, slotsRefreshInterval: 5000 })
      : new Redis(config.redis[0], options);
  conn.on('error', (e) => logger.error('Redis error:', e));
  return conn;
};

module.exports = { createClient };
