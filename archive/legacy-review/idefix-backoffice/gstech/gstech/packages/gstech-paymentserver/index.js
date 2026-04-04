/* @flow */
require('flow-remove-types/register');
require('dd-trace').init({
  logInjection: true,
});

const { isLocal } = require('gstech-core/modules/config');
const errors = require('gstech-core/modules/errors');

errors.unhandledRejections();
errors.uncaughtExceptions();

const prometheus = require('gstech-core/modules/prometheus');
const server = require('gstech-core/modules/express-server');
const { paymentServer: paymentServerPorts } = require('gstech-core/modules/ports');

const app = require('./server');
const apiServer = require('./server/api-server');

server.startServer(app, 'Payment Providers API', paymentServerPorts.port);
server.startServer(apiServer, 'Payment Server API', paymentServerPorts.apiPort);
if (!isLocal) server.startServer(prometheus.app, 'Metrics API', paymentServerPorts.metricsPort);
