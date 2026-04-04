/* @flow */
const express = require('express');
const bodyParser = require('body-parser');

const middleware = require('gstech-core/modules/express-middleware');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');

const prometheus = require('gstech-core/modules/prometheus');
const { init, initGroups } = require('./modules/management/routes');
const rewardManagementRoutes = require('./modules/management/routes');
const gameRoutes = require('./modules/games/routes');
const thumbnailRoutes = require('./modules/thumbnails/routes');
const ledgerRoutes = require('./modules/ledgers/routes');

const app: express$Application<> = express();
app.use(bodyParser.json());
app.use('/api/v1/rewards/swagger', createSwaggerRouter('./swagger/api-management.yaml'));

app.get('/api/v1/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.get('/api/v1/rewards/init', init);
app.get('/api/v1/rewards/init-groups', initGroups);
app.get('/api/v1/rewards', rewardManagementRoutes.getRewards(false));
app.post('/api/v1/rewards', rewardManagementRoutes.createReward);
app.get('/api/v1/rewards/:rewardId', rewardManagementRoutes.getReward);
app.put('/api/v1/rewards/:rewardId', rewardManagementRoutes.updateReward);
app.delete('/api/v1/rewards/:rewardId', rewardManagementRoutes.deleteReward);
app.post('/api/v1/rewards/:rewardId/duplicate', rewardManagementRoutes.duplicateReward);

app.get('/api/v1/games', gameRoutes.getGames);
app.post('/api/v1/games', gameRoutes.createGame);
app.put('/api/v1/games/:gameId', gameRoutes.updateGame);
app.delete('/api/v1/games/:gameId', gameRoutes.deleteGame);

app.get('/api/v1/games/game-manufacturers', gameRoutes.getGamesManufacturers);

app.get('/api/v1/players/:playerId/ledgers', ledgerRoutes.getAllPlayerLedgers);
app.put('/api/v1/players/:playerId/ledgers/mark-used', ledgerRoutes.markLedgerUsed);

app.get('/api/v1/games/permalinks', gameRoutes.getGamesPermalinks);
app.get('/api/v1/games/thumbnails', thumbnailRoutes.getThumbnails);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
