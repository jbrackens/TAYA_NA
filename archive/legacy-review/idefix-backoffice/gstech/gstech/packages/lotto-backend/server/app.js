/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware');

const middleware = require('gstech-core/modules/express-middleware');
const config = require('./config');

const lottoBackend = require('./modules/lotto-backend-api');
const lottoWarehouse = require('./modules/lotto-warehouse-api');

const app: express$Application<> = express();

app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));

app.get('/api/v1/status', middleware.healthCheck);

app.use('/api/v1/lottobackend', lottoBackend);
app.use('/api/v1/lottowarehouse', lottoWarehouse);

if (config.isDevelopment)
  app.use(
    '/',
    legacyCreateProxyMiddleware({ target: 'http://localhost:3030', changeOrigin: true }),
  );

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
