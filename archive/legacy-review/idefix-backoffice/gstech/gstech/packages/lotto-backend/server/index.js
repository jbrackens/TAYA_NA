/* @flow */
require('flow-remove-types/register');
require('dd-trace').init();

const errors = require('gstech-core/modules/errors');

errors.unhandledRejections();
errors.uncaughtExceptions();

const server = require('gstech-core/modules/express-server');
const ports = require('gstech-core/modules/ports');
const cron = require('gstech-core/modules/cron-server');

const app = require('./app');
const appCasino = require('./app-casino');
const config = require('./config');
const jobs = require('./modules/lotto-warehouse-jobs');

server.startServer(app, 'Lotto Backend Public API', ports.lottoBackend.port);
server.startServer(appCasino, 'Lotto Backend Private API', ports.lottoBackend.apiPort);

cron.startJob('0 * * * *', 'updateGamesJob', jobs.updateGamesJob);
cron.startJob('0 * * * *', 'updateDrawingsJob', jobs.updateDrawingsJob);
cron.startJob('0 * * * *', 'updatePayoutsJob', jobs.updatePayoutsJob);
cron.startJob('0 * * * *', 'updateSchedulesJob', jobs.updateSchedulesJob);
cron.startJob('*/15 * * * *', 'updateTicketsJob', jobs.updateTicketsJob);

if (config.isDevelopment) {
  jobs.updateGamesJob();
  jobs.updatePayoutsJob();
}
