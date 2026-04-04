/* @flow */
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const logger = require('gstech-core/modules/logger');
const middleware = require('gstech-core/modules/express-middleware');
const swagger = require('gstech-core/modules/swagger');
const minio = require('gstech-core/modules/minio');
const { optionalGoogleMiddleware } = require('gstech-core/modules/google-sso');

const prometheus = require('gstech-core/modules/prometheus');
const config = require('./config');

const authAffiliate = require('./modules/auth/affiliate/router');
const authUser = require('./modules/auth/user/router');

const affiliateRouter = require('./modules/affiliate/router');

const adminUsersRouter = require('./modules/admin/users/router');
const adminAffiliatesRouter = require('./modules/admin/affiliates/router');
const adminLandingsRouter = require('./modules/admin/landings/router');
const adminPaymentsRouter = require('./modules/admin/payments/router');
const adminPlansRouter = require('./modules/admin/plans/router');
const adminFeesRouter = require('./modules/admin/fees/router');

const { auth: userAuth } = require('./modules/auth/user/middleware');
const { auth: affiliateAuth } = require('./modules/auth/affiliate/middleware');
const { auth: apiAuth } = require('./modules/auth/api/middleware');

const { getAffiliatesOverviewHandler, canCloseMonthHandler, closeMonthHandler } = require('./modules/admin/affiliates/routes');
const { userProfileHandler } = require('./modules/auth/user/routes');
const { clickHandler, refHandler } = require('./modules/clicks/routes');
const { combinedReportsHandler, combinedSegmentsReportsHandler, mediaReportsHandler } = require('./modules/reports/routes');

const app: express$Application<> = express();

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/static', express.static(path.join(__dirname, '../public')));

if (!config.isTest) app.use(morgan('dev', { stream: { write: logger.http } }));

app.get('/api/v1/uploads/:timeStamp/:fileName', optionalGoogleMiddleware, userAuth(['admin', 'user', 'payer']), async (req: express$Request, res: express$Response) => {
  const { timeStamp, fileName } = req.params;
  minio.getObject(config.minio.bucketName, `${timeStamp}/${fileName}`, (error, stream) => {
    if (!error) {
      res.writeHead(200, {
        'content-length': stream.headers['content-length'],
        'content-type': stream.headers['content-type'],
      });
      return stream.pipe(res);
    }

    return res.status(500).send(error);
  });
});

app.get('/api/v1/status', middleware.healthCheck);
app.get('/api/status', middleware.healthCheck);

// The Prometheus middleware should be enabled before the routes we want to measure.
app.use(prometheus.middleware);

// This is clickHandler for backwards compatibility
app.get('/click/:brandNumber/:code', clickHandler);
app.get('/click/:brandNumber/:code/:segment', clickHandler);

app.get('/clk/:code', clickHandler);
app.get('/clk/:code/:segment', clickHandler);
app.get('/ref/:code', refHandler);

app.use('/api/v1/auth/affiliate', authAffiliate);
app.use('/api/v1/auth/user', authUser);

app.use('/api/v1/affiliate', optionalGoogleMiddleware);
app.use('/api/v1/affiliate', affiliateAuth(), affiliateRouter);

app.use('/api/v1/admin', optionalGoogleMiddleware);
app.use('/api/v1/admin/profile', userAuth(['admin', 'user']), userProfileHandler);
app.get('/api/v1/admin/overview/:year/:month', userAuth(['admin', 'user']), getAffiliatesOverviewHandler);
app.get('/api/v1/admin/close-month', userAuth(['admin', 'user']), canCloseMonthHandler);
app.put('/api/v1/admin/close-month', userAuth(['admin']), closeMonthHandler);

app.use('/api/v1/admin/affiliates', userAuth(['admin', 'user', 'payer']), adminAffiliatesRouter);
app.use('/api/v1/admin/landings', userAuth(['admin', 'user']), adminLandingsRouter);
app.use('/api/v1/admin/payments', userAuth(['admin', 'user', 'payer']), adminPaymentsRouter);
app.use('/api/v1/admin/plans', userAuth(['admin', 'user']), adminPlansRouter);
app.use('/api/v1/admin/fees', userAuth(['admin', 'user']), adminFeesRouter);
app.use('/api/v1/admin/users', userAuth(['admin', 'user']), adminUsersRouter);

app.use('/api/v1/affiliate-swagger', swagger.createSwaggerRouter('./swagger/affiliate-api.yaml'));
app.use('/api/v1/reports-swagger', swagger.createSwaggerRouter('./swagger/reports-api.yaml'));

if (config.isDevelopment) {
  app.use('/api/v1/admin-swagger', swagger.createSwaggerRouter('./swagger/admin-api.yaml'));
}

// legacy url handler
app.use('/api/reports/:brandNumber/combined/:year/:month', apiAuth(), combinedReportsHandler);
app.use('/api/reports/:brandNumber/combined-segments/:year/:month', apiAuth(), combinedSegmentsReportsHandler);
app.use('/api/reports/:brandNumber/media/id/:code/overview/:year/:month', apiAuth(), mediaReportsHandler);

app.use(middleware.unknownRequest);
app.use(middleware.unhandledError);

module.exports = app;
