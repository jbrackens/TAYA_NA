/* @flow */
require('dd-trace').init({ logInjection: true });

const http = require('http');
const { promisify } = require('util');
const logger = require('gstech-core/modules/logger');
const { backend: backendPorts } = require('gstech-core/modules/ports');
const prometheus = require('gstech-core/modules/prometheus');
const apiServer = require('./server');
const walletServer = require('./server/wallet-server');
const socket = require('./server/modules/core/socket');

const initServer = async (
  app: express$Application<any>,
  port: number,
  name: string,
  webSocket: boolean = false,
) => {
  app.disable('x-powered-by');

  const server = http.createServer(app);
  if (webSocket) socket.initialize(server);

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

if (backendPorts.port != null) initServer(apiServer, backendPorts.port, 'API server', true);
if (backendPorts.walletPort != null) initServer(walletServer, backendPorts.walletPort, 'Wallet server');

initServer(prometheus.app, backendPorts.metricsPort.app, 'Metrics server');

process.on('unhandledRejection', (r) => logger.error('X?X UNHANDLED REJECTION', { r }));
