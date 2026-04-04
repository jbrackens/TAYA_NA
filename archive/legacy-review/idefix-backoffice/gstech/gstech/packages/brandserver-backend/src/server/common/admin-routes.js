/* @flow */
const { optionalGoogleMiddleware } = require('gstech-core/modules/google-sso');

const configuration = require('./configuration');
const testRoutes = require('./test-routes');
const webhooks = require('./webhooks');
const wordpress = require('./wordpress');
const depositWebhooks = require('./payment/deposit-webhook');
const settings = require('./settings');

const smsAdminRoutes = require('./sms-admin-routes');
const contentAdminRoutes = require('./content-admin-routes');
const adminUiRoutes = require('./admin-ui-routes');

const logger = require('./logger');

module.exports = (app: express$Application<>) => {
  const auth = (req: express$Request, res: express$Response, next: express$NextFunction) => {
    if(configuration.productionMode()) {
      return optionalGoogleMiddleware(req, res, next);
    }
    return next();
  };

  if (configuration.productionMode()) {
    app.post('/api/test/*', auth, (req, res, next: express$NextFunction) => next());
    app.get('/api/test/*', auth, (req, res, next: express$NextFunction) => next());
  }

  if (!configuration.productionMode()) {
    testRoutes(app);
  }

  app.post('/api/admin*', auth, (req: express$Request, res: express$Response, next: express$NextFunction) => next());
  app.get('/api/admin*', auth, (req: express$Request, res: express$Response, next: express$NextFunction) => next());
  app.get('/admin*', auth, (req: express$Request, res: express$Response, next: express$NextFunction) => next());

  adminUiRoutes.bind(app);
  webhooks.bind(app);
  depositWebhooks.bind(app);
  wordpress.bind(app);

  app.post('/api/admin/gdocs/:doc', async (req: express$Request, res: express$Response) => {
    try {
      const type: any = req.params.doc;
      logger.debug('Sync start!', type);
      const errors = await settings.update(type);
      logger.debug('Sync done!', type);
      res.json({ ok: true, errors });
    } catch (e) {
      logger.warn('Sync failed!', req.params.doc, e);
      res.json({ ok: false, errors: [`${e}`] });
    }
  });

  contentAdminRoutes.bind(app);
  smsAdminRoutes.bind(app);
};
