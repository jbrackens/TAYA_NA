/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const middleware = require('gstech-core/modules/express-middleware');

const lottoCasino = require('./modules/lotto-casino-api');

const app: express$Application<> = express();

app.use(cookieParser());
app.use(bodyParser.json());

app.get('/api/v1/status', middleware.healthCheck);

app.use('/api/v1/lottocasino', lottoCasino);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
