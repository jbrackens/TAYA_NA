/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const middleware = require('gstech-core/modules/express-middleware');

const { checkPlayerHandler } = require('./routes');
const { providers } = require('./providers');
const {
  api: { sanctionCheckHandler, multipleSanctionCheckHandler, getSanctionListHandler },
} = require('./modules/sanction');
const {
  api: { ipCheckHandler },
} = require('./modules/ip');
const {
  api: { emailCheckHandler },
} = require('./modules/email');

const app: express$Application<> = express();

app.use(bodyParser.json());

app.get('/api/v1/status', middleware.healthCheck);

app.use('/api/v1/check/:countryId/:nationalId', checkPlayerHandler(providers));
app.post('/api/v1/check/sanction', sanctionCheckHandler);
app.post('/api/v1/check/multiplesanction', multipleSanctionCheckHandler);
app.get('/api/v1/sanctionlist', getSanctionListHandler);
app.post('/api/v1/check/ip', ipCheckHandler);
app.post('/api/v1/check/email', emailCheckHandler);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
