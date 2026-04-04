/* @flow */
const fs = require('fs');
const { types } = require('pg');
const knex: any = require('knex');

const config = require('./config');

types.setTypeParser(1700, parseInt); // number
types.setTypeParser(1082, value => value); // date

const crtName = 'ca-certificate.crt';
const crtExists = config.isProduction && fs.existsSync(crtName);

const pg: Knex2 = knex({
  client: 'pg',
  debug: config.postgres.debug,
  pool: {
    min: config.postgres.pool.min,
    max: config.postgres.pool.max,
  },
  connection: {
    host: config.postgres.host,
    port: config.postgres.port,
    user: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
    timezone: 'Europe/Malta',
    ...(crtExists ? {
      ssl: {
        ca: fs.readFileSync(crtName),
      },
    } : { }),
  },
});

module.exports = pg;
