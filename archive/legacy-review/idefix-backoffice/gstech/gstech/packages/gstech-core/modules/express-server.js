/* @flow */
import type { $Application } from 'express';

const http = require('http');
const morgan = require('morgan');
const { promisify } = require('util');

const config = require('./config');
const logger = require('./logger');

const startServer = (app: $Application<>, name: string, port: number) => {
  if (!port) {
    logger.error(`XXX startServer:${name}`, 'NO PORT', { name, port });
    process.exit(1);
  }

  app.disable('x-powered-by');
  if (config.isDevelopment) app.use(morgan('dev', { stream: { write: logger.http } }));

  const server = http.createServer(app);
  // $FlowFixMe[method-unbinding]
  const serverListen = promisify(server.listen.bind(server));

  serverListen(port)
    .then(() => logger.info(`+++ startServer:${name} LISTEN:${port}`))
    .catch((err) => {
      logger.error(`XXX startServer:${name}`, { err });
      process.exit(1);
    });
};

module.exports = {
  startServer,
};
