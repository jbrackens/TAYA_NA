/* @flow */
const http = require('http');
const morgan = require('morgan');
const { promisify } = require('es6-promisify');

const config = require('./config');
const logger = require('./logger');

const startServer = (app: express$Application<>, name: string, port: number) => {
  app.disable('x-powered-by');
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  }

  const server = http.createServer(app);
  const serverListen = promisify(server.listen.bind(server));

  serverListen(port)
    .then(() => logger.info(`'${name}' is listening on a port ${port}`))
    .catch((err) => {
      logger.error('Error happened during server start', err);
      process.exit(1);
    });
};

module.exports = {
  startServer,
};
