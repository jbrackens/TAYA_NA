/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const middleware = require('gstech-core/modules/express-middleware');
const prometheus = require('gstech-core/modules/prometheus');

const { depositHandler, withdrawHandler, identifyHandler, registerHandler, loginHandler } = require('./routes');
const { providers } = require('./providers');

const app: express$Application<> = express();

app.use(bodyParser.json());

app.get('/api/v1/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

app.post('/api/v1/deposit', depositHandler(providers));
app.post('/api/v1/withdraw', withdrawHandler(providers));
app.post('/api/v1/identify', identifyHandler(providers));
app.post('/api/v1/register', registerHandler(providers));
app.post('/api/v1/login', loginHandler(providers));

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
