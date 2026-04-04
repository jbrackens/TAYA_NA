/* @flow */
const url = require('url');
const { Router } = require('express');
const _ = require('lodash');
const util = require('util');
const { isLocal } = require('gstech-core/modules/config');
const { languages, findLanguage } = require('./localization');
const { detectLangCode, initContext } = require('./utils');
const { activate } = require('./modules/activation');
const wordpress = require('./wordpress');
const logger = require('./logger');
const { getNextUrlAfterLogin } = require('./modules/login');
const { Journey, createNonloggedinJourney } = require('./journey');
const clientCallback = require('./client-callback');
const liveagent = require('./liveagent');
const repository = require('./repository');
const utils = require('./utils');
const { getBlockedCountries } = require('./modules/memoized');
const configuration = require('./configuration');
const { isValidSession } = require('./modules/session');
const { common, registrationFormData } = require('./router-helpers');

const isBlockedCountry = async (req: express$Request) => {
  const { context: ctx, headers } = req;
  const { country, whitelisted, spider } = ctx;
  const blockedCountries = await getBlockedCountries();
  const remoteIpAddress = utils.getRemoteAddress(req);
  const ipAllowed = configuration.isIpAllowed(remoteIpAddress);
  const countryBlocked = _.includes(blockedCountries, country.CountryISO);
  const checkEnabled = configuration.productionMode() || isLocal;
  const block = checkEnabled && countryBlocked && !ipAllowed && !whitelisted && !spider;
  logger.info(`+++ isBlockedCountry::${block ? 'BLOCK' : 'ALLOW'}`, {
    remoteIpAddress,
    checkEnabled,
    countryBlocked,
    ipAllowed,
    whitelisted,
    spider,
    ctx,
    headers,
  });
  return block;
};

const redirectAsJson = (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  (res: any).redirect = (location) => res.json({ location });
  next();
};

const routes = (
  app: express$Router<>,
  render: (
    req: express$Request,
    res: express$Response,
    next: express$NextFunction,
    lang?: string,
    id?: string,
    appendHeaderFooter?: boolean,
  ) => Promise<void | mixed>,
) => {
  for (const lang of languages) {
    app.all(
      `/${lang.code}*`,
      (req: express$Request, res: express$Response, next: express$NextFunction) => {
        if (lang.override) return res.redirect(`${req.url.replace(lang.code, lang.override)}/`);
        initContext(req, res, req.user, lang);
        return next();
      },
    );

    app.get(
      `/${lang.code}/`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, 'main-lander'),
    );
    app.get(
      `/${lang.code}/login/`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, 'main-lander'),
    );
    app.get(
      `/${lang.code}/login/again/`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, 'main-lander'),
    );
    app.get(
      `/${lang.code}/forgot/`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, 'main-lander'),
    );
    app.get(`/${lang.code}/reset`, (req: express$Request, res: express$Response) =>
      frontpage(req, res, 'reset-password', { code: req.query.code, email: req.query.email }),
    );
    app.get(
      `/${lang.code}/unsubscribe`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        isValidSession(req, true).then((loggedin) => {
          if (loggedin) return res.redirect('/loggedin/myaccount/subscription/');
          return render(req, res, next, lang.code, 'main-lander');
        }),
    );

    app.get(
      `/${lang.code}/promo/:page`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, req.params.page),
    );

    app.get(`/${lang.code}/activate/:id`, async (req: express$Request, res: express$Response) => {
      try {
        await activate(req, res, req.params.id);
        const active = await isValidSession(req, true);
        if (active) {
          const nUrl = await getNextUrlAfterLogin(req);
          return res.redirect(nUrl || '/loggedin/');
        }
        return res.redirect(`/${lang.code}/login/`);
      } catch (e) {
        logger.warn('Activation failed', e);
        return res.redirect(`/${lang.code}/`);
      }
    });

    app.get(
      `/${lang.code}/content/:page`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code, req.params.page, false),
    );
    app.get(
      `/${lang.code}/pages/:page`,
      async (req: express$Request, res: express$Response, next: express$NextFunction) => {
        const active = await isValidSession(req, true);
        if (active) return res.redirect(`/loggedin/pages/${req.params.page}`);
        return render(req, res, next, lang.code, req.params.page);
      },
    );
    app.get(
      `/${lang.code}/:page`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        render(req, res, next, lang.code),
    );

    const frontpage = async (
      req: express$Request,
      res: express$Response,
      page: string = 'frontpage',
      x: { ... } | { code: string, email: string } = {},
    ) => {
      if (_.has(req.query, 'setlanguage'))
        res.cookie('ld_lang', lang.code, { maxAge: 900000, httpOnly: false });
      const journey = new Journey(req);
      const d = await registrationFormData(req);
      res.render(
        page,
        _.extend({}, { repository, journey }, d, x, common(lang, req, res, true)),
        (err, content) => {
          res.send(content);
        },
      );
    };

    const gamespage = (req: express$Request, res: express$Response) => {
      const journey = new Journey(req);
      res.render(
        'gamespage',
        _.extend({ repository, game: null, journey }, common(lang, req, res, true)),
        (err, content) => {
          res.send(content);
        },
      );
    };

    app.get(`/${lang.code}/games/all/`, (req: express$Request, res: express$Response) =>
      gamespage(req, res),
    );

    const game = async (req: express$Request, res: express$Response) => {
      try {
        const journey = new Journey(req);
        const game = await repository.findGame(req.params.game, journey);
        res.render(
          'gamespage',
          _.extend({ repository, game, journey }, common(lang, req, res, true)),
          (err, content) => {
            res.send(content);
          },
        );
      } catch (e) {
        res.redirect(`/${lang.code}/`);
      }
    };
    app.get(`/${lang.code}/game/:game`, game);
    app.get(`/${lang.code}/group/:game`, game);
  }

  app.get('/promo/:id', (req: express$Request, res: express$Response) => {
    const langCode = detectLangCode(req);
    const params = _.omit(req.query, 'btag');
    const p = url.format({ query: params });
    return res.redirect(`/${langCode}/promo/${req.params.id}${p}`);
  });

  app.get('/register', (req: express$Request, res: express$Response) => {
    const langCode = detectLangCode(req);
    res.redirect(`/${langCode}/#register`);
  });

  app.get('/', (req: express$Request, res: express$Response) => {
    const langCode = detectLangCode(req);
    res.redirect(`/${langCode}/`);
  });
};

const initCommonPublicRoutes = (app: express$Router<>) => {
  const cmsRouter = new Router();
  routes(
    cmsRouter,
    async (
      req: express$Request,
      res: express$Response,
      next: express$NextFunction,
      lang: string = req.params.lang,
      id: string = req.params.page,
      appendHeaderFooter: boolean = false, // eslint-disable-line no-unused-vars
    ) => {
      common(findLanguage(req.params.lang), req, res, true);

      const journey = createNonloggedinJourney(req);
      const blocked = await isBlockedCountry(req);

      if (blocked) {
        const formData = await registrationFormData(req);
        return wordpress.page(
          req,
          res,
          next,
          req.context.languageISO,
          'country-block',
          {
            formData,
            config: { ...res.locals.state, liveagent: liveagent.clientConfig(journey) },
            httpStatus: 451,
            login: false,
          },
          true,
        );
      }

      const formData = await registrationFormData(req);

      await clientCallback.pushEvent(req, {
        event: 'landingpage_hit',
        landingpage: id,
        affiliate: req.query.btag || req.cookies.ldaffid2,
      });
      const update = await clientCallback.expose(req);

      wordpress.page(req, res, next, lang, id, {
        mobile: req.context.mobile,
        formData,
        update,
        config: {
          ...res.locals.state,
          liveagent: liveagent.clientConfig(journey),
          showPhoneLogin: false,
          showLogin: id === 'main-lander' && req.cookies.ldl != null,
        },
      });
    },
  );
  app.use('/api/cms', redirectAsJson, cmsRouter);
  for (const lang of languages)
    app.get(
      `/${lang.code}/content/:page`,
      (req: express$Request, res: express$Response, next: express$NextFunction) =>
        wordpress.deliverPage(req, res, next, lang.code, req.params.page, false),
    );
};

const errorRoutes = async (
  err: any,
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> => {
   
  utils.initContext(req, res, req.user);

  if (req.path.indexOf('/api/cms') === 0) {
    const journey = new Journey(req);
    const formData = await registrationFormData(req);
    const config = { ...res.locals.state, liveagent: liveagent.clientConfig(journey) };
    res.status(200);
    if (err === '404')
      return wordpress.page(
        req,
        res,
        next,
        'en',
        'page-not-found',
        { formData, config, httpStatus: 404, login: false },
        true,
      );
    logger.error('500 PAGE SHOWN', util.inspect(err), req.url);
    return wordpress.page(
      req,
      res,
      next,
      'en',
      'error-page',
      { formData, config, httpStatus: 500, login: false },
      true,
    );
  }
  if (err === '404')
    return wordpress.deliverPage(req, res, next, 'en', 'page-not-found', false, true);
  logger.error('500 PAGE SHOWN', util.inspect(err), req.url);
  return wordpress.deliverPage(req, res, next, 'en', 'error-page', false, true);
};

module.exports = { initCommonPublicRoutes, errorRoutes };
