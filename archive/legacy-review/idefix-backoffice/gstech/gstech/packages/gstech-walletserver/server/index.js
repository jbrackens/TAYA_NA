/* @flow */
const express = require('express');
const middleware = require('gstech-core/modules/express-middleware');
const prometheus = require('gstech-core/modules/prometheus');
const config = require('../config');

const { routers } = require('./providers');

const app: express$Application<> = express();

app.get('/api/v1/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.use('/api/v1/bf', routers.BFG); // bf is used in production
app.use('/api/v1/bfgames', routers.BFG);
app.use('/api/v1/booming', routers.BOO);
app.use('/api/v1/elk', routers.ELK);
app.use('/api/v1/evolution', routers.EVO);
app.use('/api/v1/eyecon', routers.EYE);
if (!config.isProduction) app.use('/api/v1/habanero', routers.HB);
app.use('/api/v1/nolimitcity', routers.NC);
app.use('/api/v1/microgaming', routers.MGS);
// app.use('/api/v1/netent', routers.NE);
app.use('/api/v1/oryx', routers.ORX);
app.use('/api/v1/playngo', routers.PNG);
app.use('/api/v1/pragmatic', routers.PP);
app.use('/api/v1/redtiger', routers.RTG);
app.use('/api/v1/synot', routers.SYN);
app.use('/api/v1/thunderkick', routers.TK);
app.use('/WilliamsInteractive', routers.SGI);
app.use('/api/v1/yggdrasil', routers.YGG);
app.use('/api/v1/betby', routers.BBY);
app.use('/api/v1/relax', routers.RLX);
// app.use('/api/v1/delasport', routers.DS);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
