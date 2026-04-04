/* @flow */
require('flow-remove-types/register');
require('dd-trace').init({
  logInjection: true,
});

const { isLocal } = require('gstech-core/modules/config');
const errors = require('gstech-core/modules/errors');
const server = require('gstech-core/modules/express-server');
const { rewardServer: rewardServerPorts } = require('gstech-core/modules/ports');
const cron = require('gstech-core/modules/cron-server');

const prometheus = require('gstech-core/modules/prometheus');
const consumer = require('./server/consumer');
const config = require('./server/config');

errors.unhandledRejections();
errors.uncaughtExceptions();

const app = require('./server/app');
const managementApp = require('./server/app-management');

consumer.startConsumingWageringEvent();

const importBlurhashes = require('./jobs/importBlurhashes');

if (!config.isTest && !isLocal) cron.startJob('*/5 * * * *', 'import blurhashes', importBlurhashes);

server.startServer(app, 'Reward Server API', rewardServerPorts.port);
server.startServer(managementApp, 'Reward Server Management API', rewardServerPorts.management);
if (!isLocal) server.startServer(prometheus.app, 'Metrics API', rewardServerPorts.metricsPort);

// Import on server start
if (!isLocal) importBlurhashes();
