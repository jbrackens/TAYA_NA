/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const middleware = require('gstech-core/modules/express-middleware');
const prometheus = require('gstech-core/modules/prometheus');

const {
  launchGameHandler,
  launchDemoGameHandler,
  creditFreeSpinsHandler,
  createFreeSpinsHandler,
  getJackpotsHandler,
  getLeaderBoardHandler,
  pingHandler,
} = require('./routes');
const { providers } = require('./providers');

const app: express$Application<> = express();

app.use(bodyParser.json({ limit: '50MB' }));

app.get('/api/v1/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

// TODO: improve routing: remote "get" prefixes, drop parameters - put them as message body
app.post('/api/v1/:brandId/game/:manufacturerId', launchGameHandler(providers));
app.post('/api/v1/:brandId/game/:manufacturerId/demo', launchDemoGameHandler(providers));
app.post('/api/v1/:brandId/creditfreespins/:manufacturerId', creditFreeSpinsHandler(providers));
app.post('/api/v1/:brandId/getjackpots/:manufacturerId', getJackpotsHandler(providers));
app.post(
  '/api/v1/:brandId/getleaderboard/:manufacturerId/:achievement',
  getLeaderBoardHandler(providers),
);
app.post('/api/v1/:brandId/ping/:manufacturerId', pingHandler(providers));
app.post('/api/v1/createfreespins/:manufacturerId', createFreeSpinsHandler(providers));

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
