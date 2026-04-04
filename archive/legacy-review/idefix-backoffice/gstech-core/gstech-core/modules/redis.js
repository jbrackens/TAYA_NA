/* @flow */
const Redis = require('ioredis');

const config = require('./config');
const logger = require('./logger');

(Redis: any).Promise = require('bluebird');

const createClient = (defaultKeyPrefix: string = config.appName) => {
  const options = { keyPrefix: `{${defaultKeyPrefix}}` };
  const conn = config.redis.length > 1 ? new Redis.Cluster(config.redis, options) : new Redis(config.redis[0], options);
  conn.on('error', e => logger.error('Redis error:', e));
  return conn;
};

module.exports = { createClient };
