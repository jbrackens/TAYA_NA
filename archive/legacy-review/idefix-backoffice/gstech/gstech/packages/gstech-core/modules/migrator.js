/* @flow */
require('flow-remove-types/register');

const migrations = require('sql-migrations');  
const logger = require('./logger');
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

migrations.setLogger({
  log: logger.info,
  error: logger.error
})

migrations.run(configuration);
