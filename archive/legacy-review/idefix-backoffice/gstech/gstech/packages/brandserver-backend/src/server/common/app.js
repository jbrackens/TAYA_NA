/* @flow */
const express = require('express');
const http = require('http');
const { promisify } = require('util');
const expressServer = require('gstech-core/modules/express-server');
const prometheus = require('gstech-core/modules/prometheus');
const { isLocal } = require('gstech-core/modules/config')
const { brandServerBackend: brandServerBackendPorts } = require('gstech-core/modules/ports');
const logger = require('./logger');
const websocket = require('./websocket');
const configuration = require('./configuration');

const port = process.env.PORT || 3000;

const s = require('./server');

logger.info(`>>> Start Server [${configuration.shortBrandId()}] <<<`);

const initServer = async (app: express$Application<>) => {
  app.disable('x-powered-by');

  await s(app);

  const server = http.createServer(app);
  websocket.bind(server);
  // $FlowFixMe[method-unbinding]
  const serverListen = promisify(server.listen.bind(server));
  try {
    await serverListen(port);
    logger.info(`+++ initServer:${configuration.shortBrandId()} LISTEN:${port}`);
    app.emit('started');
  } catch (err) {
    logger.error(`XXX initServer:${configuration.shortBrandId()}`, { err })
    process.exit(1);
  }
};

const app: express$Application<> = express();
initServer(app);

const { app: appMetricsPort } = brandServerBackendPorts.metricsPorts[configuration.shortBrandId()];
if (!isLocal) expressServer.startServer(prometheus.app, 'Metrics API', appMetricsPort);

module.exports = app;
