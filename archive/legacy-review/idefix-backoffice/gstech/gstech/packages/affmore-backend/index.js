/* @flow */
require('flow-remove-types/register');
require('dd-trace').init({
  logInjection: true,
});

const { isLocal } = require('gstech-core/modules/config');
const { DateTime } = require('luxon');
const errors = require('gstech-core/modules/errors');

errors.unhandledRejections();
errors.uncaughtExceptions();

const prometheus = require('gstech-core/modules/prometheus');
const server = require('gstech-core/modules/express-server');
const cron = require('gstech-core/modules/cron-server');
const { affmoreBackend: affmoreBackendPorts } = require('gstech-core/modules/ports');

const app = require('./server/app');
const apiServer = require('./server/api-server');
const { updateData } = require('./jobs/updateData');

if (!isLocal) require('./server/queue');

server.startServer(app, 'Affmore API', affmoreBackendPorts.port);
server.startServer(apiServer, 'Affmore Backend API', affmoreBackendPorts.apiPort);
if (!isLocal) server.startServer(prometheus.app, 'Metrics API', affmoreBackendPorts.metricsPort);

// eslint-disable-next-line
if (!process.env.CRON_DISABLED && !isLocal && false) { // disabling affitiate commissions update
  cron.startJob('*/10 * * * *', 'updateData every 10 mins', () => updateData(DateTime.local()));
  cron.startJob('0 1 * * *', 'updateData at end of day', () =>
    updateData(DateTime.local().minus({ days: 1 })),
  );
}
