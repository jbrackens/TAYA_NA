/* @flow */
require('dd-trace').init();

const http = require('http');
const { promisify } = require('util');
const { isLocal } = require('gstech-core/modules/config');
const logger = require('gstech-core/modules/logger');
const { backend: backendPorts } = require('gstech-core/modules/ports');
const prometheus = require('gstech-core/modules/prometheus');

require('./server/modules/core/notifications/Worker');
require('./server/modules/core/notifications-eeg/Worker');
if (!isLocal) require('./server/modules/core/optimove/Worker');

const initServer = async (app: express$Application<any>, port: number, name: string) => {
  app.disable('x-powered-by');

  const server = http.createServer(app);
  // $FlowFixMe[method-unbinding]
  const serverListen = promisify(server.listen.bind(server));
  try {
    await serverListen(port);
    logger.info(`+++ initServer:${name} LISTEN:${port}`);
  } catch (err) {
    logger.error(`XXX startServer:${name}`, { err });
    process.exit(1);
  }
};

if (!isLocal) initServer(prometheus.app, backendPorts.metricsPort.worker, 'Metrics server');
process.on('unhandledRejection', (r) => logger.error('X?X UNHANDLED REJECTION', { r }));
