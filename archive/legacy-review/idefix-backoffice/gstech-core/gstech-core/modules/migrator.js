/* @flow */
require('flow-remove-types/register');

const migrations = require('sql-migrations');  // eslint-disable-line
const config = require('./config');

const configuration = {
  migrationsDir: config.postgres.data,
  host: config.postgres.host,
  port: config.postgres.port,
  db: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  adapter: 'pg',
};

migrations.run(configuration);
