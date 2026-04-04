/* @flow */
require('flow-remove-types/register');
require('dd-trace').init({
  logInjection: true,
});

const { isLocal } = require('gstech-core/modules/config');
const errors = require('gstech-core/modules/errors');
const logger = require('gstech-core/modules/logger');

errors.unhandledRejections();
errors.uncaughtExceptions();

const server = require('gstech-core/modules/express-server');
const { walletServer: walletServerPorts } = require('gstech-core/modules/ports');
const cron = require('gstech-core/modules/cron-server');

const prometheus = require('gstech-core/modules/prometheus');
const config = require('./config');
const app = require('./server');
const apiServer = require('./server/api-server');

const pragmatic = require('./server/modules/pragmatic/PragmaticJob');
const microgaming = require('./server/modules/microgaming/MicrogamingJob');
const { startEventConsumption } = require('./server/modules/evo-oss/eventListener');

server.startServer(app, 'Game Providers API', walletServerPorts.port);
server.startServer(apiServer, 'Wallet Server API', walletServerPorts.apiPort);

if (!isLocal) {
  server.startServer(prometheus.app, 'Metrics API', walletServerPorts.metricsPort);

  cron.startJob('0 */10 * * * *', 'closeRoundsJob', pragmatic.closeRoundsJob);
  cron.startJob('0 */10 * * * *', 'processJob', microgaming.processJob);
}

if (config.enableEvolutionEvents && !isLocal) {
  logger.info('+++ Evolution [Events enabled]');
  startEventConsumption();
} else {
  logger.info('+++ Evolution [Events disabled]');
}
