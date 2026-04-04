// @flow
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');
const { optionalGoogleMiddleware } = require('gstech-core/modules/google-sso');
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware');
const logger = require('gstech-core/modules/logger');
const prometheus = require('gstech-core/modules/prometheus');
const config = require('../config');
const router = require('./router');
const apiRouter = require('./api-router');
const { apiTestRouter, testRouter } = require('./test-router');
const errorHandler = require('./error-handler');
const { access: { requireAuthentication } } = require('./modules/users');

require('gstech-core/modules/pg');

const app: express$Application<> = express();

const authenticatedProxy = (target: string, token: string, service: string) =>
  legacyCreateProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/api/${service}/v1/`]: '/' },
    onProxyReq: (proxyReq) => token && proxyReq.setHeader('X-token', token),
  });

app.use(cookieParser());
app.use(optionalGoogleMiddleware);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.use(
  '/api/campaignserver/v1',
  requireAuthentication,
  authenticatedProxy(
    config.api.campaignServer.private,
    config.api.campaignServer.authToken,
    'campaignserver',
  ),
);
app.use(
  '/api/rewardserver/v1',
  requireAuthentication,
  authenticatedProxy(
    config.api.rewardServer.private,
    config.api.rewardServer.authToken,
    'rewardserver',
  ),
);

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (config.isDevelopment) {
  app.use(morgan('dev', { stream: { write: logger.http } }));
  logger.debug('Binding test routes');
  app.use('/api/v1/test', testRouter);
}

app.use('/api/v1/swagger', createSwaggerRouter(path.join(__dirname, 'swagger/api.yaml')));
app.use('/api/v1', router);

app.use('/api/:brandId/v1/swagger', createSwaggerRouter(path.join(__dirname, 'swagger/api-branded.yaml')));
app.use('/api/:brandId/v1', apiRouter);

if (config.isDevelopment || config.isTest) app.use('/api/:brandId/v1', apiTestRouter);

app.use(errorHandler);

module.exports = app;
