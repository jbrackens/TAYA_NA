/* @flow */
const express = require('express');
const path = require('path');
const expstate = require('express-state');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');
const { cookieSecret, session } = require('./session');
const utils = require('./utils');
const backend = require('./backend');
const { findPlayer } = require('./modules/legacy-player');

const configuration = require('./configuration');
const logger = require('./logger');

const routes = configuration.requireProjectFile('./routes');

const f = (name: string) => path.join(__dirname, `../../../${name}`);

const createServer = (app: express$Application<>) => {
  logger.info(`Starting ${process.env.NODE_ENV || 'development'} server`);
  app.disable('x-powered-by');
  app.disable('etag');
  app.set('view engine', 'pug');
  app.enable('trust proxy');
  app.use(morgan('dev', { stream: { write: logger.http } }));

  expstate.extend(app);
  app.use(compression());
  app.use(cookieParser(cookieSecret, { secureProxy: true }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

  app.use(
    bodyParser.json({
      type: '*/json',
    }),
  );

  app.get('/api/status', (req: express$Request, res: express$Response) => res.json({ ok: true }));
  app.use(session);
  app.use('*', async (req: express$Request, res: express$Response, next: express$NextFunction) => {
    if (process.env.DEBUG_FAKE_IP && process.env.DEBUG_FAKE_CNTRY) {
      const { DEBUG_FAKE_IP, DEBUG_FAKE_CNTRY } = process.env;
      req.headers['x-forwarded-for'] = DEBUG_FAKE_IP;
      req.headers['x-client-ip'] = DEBUG_FAKE_IP;
      req.headers['cf-connecting-ip'] = DEBUG_FAKE_IP;
      req.headers['cf-ipcountry'] = DEBUG_FAKE_CNTRY;
    }

    if (req.session == null || req.session.username == null) {
      return next();
    }

    try {
      const player = await findPlayer(req.session.username)
      if (player != null) {
        req.user = player;
        return next();
      }
    } catch (e) {
      logger.error('Unable to find player', req.session.username, e);
      if (req.session != null) {
        req.session.destroy();
      }
      return next(e);
    }
  });

  app.set('views', f(`src/pug/${configuration.project()}`));

  // TODO: temporary method to debug IP address
  app.use('/api/ip-check', async (req: express$Request, res: express$Response, next: express$NextFunction) => {
    try {
      const ipAddress = utils.getRemoteAddress(req, true);

      logger.warn(`Your IP address is ${ipAddress}`);

      return res.send(`Your IP address is ${ipAddress}`);
    } catch (e) {
      logger.error('Unable to check IP address', e);
      return next(e);
    }
  });


  app.use('/admin', utils.whitelistAuth());
  app.use('/admin', express.static(f('public/admin/'), { maxAge: 1000 * 60 * 30 }));
};

module.exports = async (app: express$Application<>) => {
  await backend.init();
  createServer(app);
  routes(app);
};
