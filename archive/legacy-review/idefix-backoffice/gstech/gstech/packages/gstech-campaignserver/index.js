/* @flow */
require('flow-remove-types/register');
require('dd-trace').init({
  logInjection: true,
});

const { isLocal } = require('gstech-core/modules/config');
const prometheus = require('gstech-core/modules/prometheus');
const errors = require('gstech-core/modules/errors');
const server = require('gstech-core/modules/express-server');
const { campaignServer: campaignServerPorts } = require('gstech-core/modules/ports');
const cron = require('gstech-core/modules/cron-server');

const consumer = require('./server/consumer');
const config = require('./server/config');
const { init: initWorkers } = require('./server/workers');

errors.unhandledRejections();
errors.uncaughtExceptions();

const sendCorrespondence = require('./server/jobs/sendCorrespondence');
const syncCountries = require('./server/jobs/syncCountries');
const startCampaigns = require('./server/jobs/startCampaigns');
const updatePlayersCampaignsMembership = require('./server/jobs/updatePlayersCampaignsMembership');

const app = require('./server/app');
const privateApp = require('./server/app-private');

consumer.startConsumingPlayerUpdateEvent();
consumer.startConsumingDepositEvent();
initWorkers();
server.startServer(app, 'Campaign Server API', campaignServerPorts.publicPort);
server.startServer(privateApp, 'Campaign Server Private API', campaignServerPorts.privatePort);
if (!isLocal) server.startServer(prometheus.app, 'Metrics API', campaignServerPorts.metricsPort);

if (!config.isTest) {
  cron.startJob('*/5 * * * *', 'send correspondence', sendCorrespondence);
  cron.startJob('*/8 * * * *', 'start campaigns', startCampaigns);
  cron.startJob('*/9 * * * *', 'update players campaigns membership', updatePlayersCampaignsMembership);
  cron.startJob('0 0 * * *', 'sync countries', syncCountries);
}

// Sync on server start
syncCountries();
