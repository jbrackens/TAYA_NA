/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const hstore = require('pg-hstore')();

const middleware = require('gstech-core/modules/express-middleware');
const pg = require('gstech-core/modules/pg');
const { setTypeParser } = require('gstech-core/modules/utils');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');

pg('pg_type').select('oid').where({ typname: 'hstore' }).first()
  .then(({ oid }) =>
    setTypeParser(oid, value => // hstore
      Object.keys(hstore.parse(value)).reduce((acc, curr) => {
        acc.push(curr);
        return acc;
      }, [])));

const prometheus = require('gstech-core/modules/prometheus');
const { getPlayerProgress } = require('./modules/progresses/routes');
const {
  getAvailableRewards,
  getRewardInfo,
  creditReward,
  creditRewardByExternalId,
  exchangeReward,
} = require('./modules/rewards/routes');
const { init, initGroups, getRewards } = require('./modules/management/routes');
const ledgerRoutes = require('./modules/ledgers/routes');
const { getPlayerGames } = require('./modules/games/routes');
const { brandIdParamHandler } = require('./utils');

const app: express$Application<> = express();
app.use(bodyParser.json({ limit: '50MB' }));
app.use('/api/v1/swagger', createSwaggerRouter('./swagger/api.yaml'));

app.param('brandId', brandIdParamHandler);

app.get('/api/v1/status', middleware.healthCheck);

app.all('*', middleware.requireAuthenticationToken('rewardServer'));

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.get('/api/v1/rewards/init', init);
app.get('/api/v1/rewards/init-groups', initGroups);
app.get('/api/v1/rewards', getRewards(true));
app.get('/api/v1/rewards/:rewardId', getRewardInfo);
app.post('/api/v1/rewards/:rewardId/credit', creditReward);

app.get('/api/v1/:brandId/progresses', getPlayerProgress);
app.get('/api/v1/:brandId/rewards/available', getAvailableRewards);
app.post('/api/v1/:brandId/rewards/credit', creditRewardByExternalId);
app.post('/api/v1/:brandId/rewards/:rewardId/credit', creditReward);
app.post('/api/v1/:brandId/rewards/:rewardId/exchange', exchangeReward);

app.get('/api/v1/:brandId/ledgers', ledgerRoutes.getUnusedLedgers);
app.post('/api/v1/:brandId/ledgers/import', ledgerRoutes.importPlayerLedgers);
app.post('/api/v1/:brandId/ledgers/:ledgerId/use', ledgerRoutes.useLedger);
app.post('/api/v1/:brandId/ledgers/use-wheel', ledgerRoutes.useWheelSpin);

app.get('/api/v1/:brandId/players/:playerId/balance', ledgerRoutes.getPlayerBalance);

app.get('/api/v1/players/:playerId/ledgers', ledgerRoutes.getAllPlayerLedgers);
app.get('/api/v1/players/:playerId/ledgers-with-events', ledgerRoutes.getAllPlayerLedgersWithEvents);
app.put('/api/v1/players/:playerId/ledgers/mark-used', ledgerRoutes.markLedgerUsed);

app.get('/api/v1/:brandId/games', getPlayerGames);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
