/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const hstore = require('pg-hstore')();
const { legacyCreateProxyMiddleware } = require('http-proxy-middleware');
const cookieParser = require('cookie-parser');

const prometheus = require('gstech-core/modules/prometheus');
const config = require('gstech-core/modules/config');
const middleware = require('gstech-core/modules/express-middleware');
const pg = require('gstech-core/modules/pg');
const { createSwaggerRouter } = require('gstech-core/modules/swagger');
const { setTypeParser } = require('gstech-core/modules/utils');
const { requiredGoogleMiddleware } = require('gstech-core/modules/google-sso');

pg('pg_type').select('oid').where({ typname: 'hstore' }).first()
  .then(({ oid }) =>
    setTypeParser(oid, value => // hstore
      Object.keys(hstore.parse(value)).reduce((acc, curr) => {
        acc.push(curr);
        return acc;
      }, [])));

const campaignsRouter = require('./modules/Campaigns/router');
const campaignGroupsRouter = require('./modules/CampaignGroups/router');
const configRouter = require('./modules/Config/router');
const emailsRouter = require('./modules/Emails/router');
const notificationsRouter = require('./modules/Notifications/router');
const playersRouter = require('./modules/Players/router');
const smsesRouter = require('./modules/Smses/router');
const contentRouter = require('./modules/Content/router');

const app: express$Application<> = express();
app.get('/api/v1/status', middleware.healthCheck);

app.use(cookieParser());
app.use(requiredGoogleMiddleware);
app.use(prometheus.middleware);

app.use(
  '/api/v1/rewards',
  legacyCreateProxyMiddleware({
    target: config.api.rewardServer.management,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/': '' },
  }),
);
app.use(
  '/api/v1/games',
  legacyCreateProxyMiddleware({
    target: config.api.rewardServer.management,
    changeOrigin: true,
    pathRewrite: { '^/api/v1/': '' },
  }),
);

app.use(fileUpload());
app.use(bodyParser.json());

app.use('/api/v1/config/', configRouter);
app.use('/api/v1/campaigns/', campaignsRouter);
app.use('/api/v1/campaign-groups', campaignGroupsRouter);
app.use('/api/v1/emails/', emailsRouter);
app.use('/api/v1/notifications/', notificationsRouter);
app.use('/api/v1/players/', playersRouter);
app.use('/api/v1/smses/', smsesRouter);
app.use('/api/v1/content/', contentRouter);

app.use('/api/v1/swagger', createSwaggerRouter('./swagger/api.yaml'));

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
