/* @flow */
require('flow-remove-types/register');
require('dd-trace').init();

const errors = require('gstech-core/modules/errors');
const cron = require('gstech-core/modules/cron-server');

errors.unhandledRejections();
errors.uncaughtExceptions();

const server = require('gstech-core/modules/express-server');
const ports = require('gstech-core/modules/ports');
const app = require('./api-server');
const { prepareSearchInstance } = require('./modules/sanction');
const { prepareIpAddresses } = require('./modules/ip');
const config = require('./config');

if (!config.isTest) {
  cron.startJob('0 1 * * *', 'refresh sanction lists', () => prepareSearchInstance(true));
}

Promise.all([
  prepareSearchInstance(),
  prepareIpAddresses(),
]).then(() => server.startServer(app, 'Compliance Server API', ports.complianceServer.port));
