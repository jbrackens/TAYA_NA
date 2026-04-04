// @flow
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');
const prometheus = require('gstech-core/modules/prometheus');
const logger = require('gstech-core/modules/logger');
const config = require('../config');
const walletRouter = require('./wallet-router');
const errorHandler = require('./error-handler');
const { testRouter } = require('./test-router');

const app: express$Application<> = express();

// middlewares
app.use(bodyParser.json());
app.use(prometheus.middleware);

if (config.isDevelopment) {
  app.use(morgan('dev', { stream: { write: logger.http } }));
  app.use('/api/v1/wallet/test', testRouter);
}

// api
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/wallet/swagger', createSwaggerRouter(path.join(__dirname, 'swagger/api-wallet.yaml')));
app.use(errorHandler);
module.exports = app;
