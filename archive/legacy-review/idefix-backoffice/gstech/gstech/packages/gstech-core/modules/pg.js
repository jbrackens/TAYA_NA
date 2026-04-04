/* @flow */
const { Interval } = require('luxon');
const { types } = require('pg');
const knex = require('knex');
const { attachPaginate } = require('knex-paginate');
const logger = require('./logger');
const config = require('./config');

attachPaginate();

types.setTypeParser(1700 /* number */, parseInt);
types.setTypeParser(1082 /* date */, (value) => value);
types.setTypeParser(3912 /* daterange */, (value) =>
  Interval.fromISO(value.slice(1, -1).replace(',', '/'), { zone: 'UTC' }),
);

const pg: Knex = knex({
  client: 'pg',
  debug: config.postgres.debug,
  pool: {
    min: config.postgres.pool.min,
    max: config.postgres.pool.max,
  },
  log: {
    warn(message: string) {
      const { stack } = new Error();
      logger.warn('KNEX', { message, stack });
    },
    error(message: string) {
      const { stack } = new Error();
      logger.error('KNEX', { message, stack });
    },
    deprecate(message: string) {
      const { stack } = new Error();
      logger.warn('KNEX deprecate', { message, stack });
    },
    debug(message: { sql: string, bindings: any[] }) {
      let q;
      try {
        const { sql, bindings } = message;
        q = knex({ client: 'pg' }).raw(sql, bindings).toString();
      } catch (e) {
        q = `Query render unavailable: ${e}`;
      }
      logger.debug('<>KNEX<>', { q, message });
    },
  },
  connection: {
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    timezone: 'Europe/Malta',
    ...(config.postgres.ca
      ? {
          ssl: {
            ca: config.postgres.ca,
          },
        }
      : {}),
  },
});

module.exports = pg;
