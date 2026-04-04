/* @flow */
require('flow-remove-types/register');
const path = require('path')
const migrations = require('sql-migrations');   
const config = require('gstech-core/modules/config');

const configuration = {
  migrationsDir: path.resolve(__dirname,config.optimove.data),
  host: config.optimove.host,
  port: config.optimove.port,
  db: config.optimove.database,
  user: config.optimove.user,
  password: config.optimove.password,
  adapter: 'pg',
};

console.log({
  configuration,
});

migrations.run(configuration);
