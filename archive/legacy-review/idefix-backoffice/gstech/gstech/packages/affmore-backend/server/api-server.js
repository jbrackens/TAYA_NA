/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const middleware = require('gstech-core/modules/express-middleware');
const { getAffiliatesHandler } = require('./modules/admin/affiliates/routes');

const app: express$Application<> = express();

app.use(bodyParser.json());

app.get('/api/status', middleware.healthCheck);
app.get('/api/v1/status', middleware.healthCheck);

app.get('/api/v1/affiliates', getAffiliatesHandler);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
