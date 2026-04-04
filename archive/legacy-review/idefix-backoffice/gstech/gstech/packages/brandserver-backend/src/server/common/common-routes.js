/* @flow */
const swagger = require('gstech-core/modules/swagger');
const _ = require('lodash');
const utils = require('./utils');
const { createJourney } = require('./journey');
const notifications = require('./notifications');
const smsverification = require('./smsverification');
const { smsRateLimiterMiddlewares, emailRateLimiterMiddlewares } = require('./sms-rate-limit');
const { handleError } = require('./extensions');
const payments = require('./payment/payments');
const { sendActivation } = require('./modules/activation');
const profile = require('./modules/profile');
const { apiLoggedIn, brandserverMiddleware, checkIpCountry } = require('./router-helpers');
const tc = require('./modules/tc');
const withdraw = require('./modules/withdraw');
const questionnaires = require('./modules/questionnaires');
const ping = require('./modules/ping');
const subscriptions = require('./modules/subscriptions');
const {
  validatePasswordResetHandler,
  requestPasswordResetHandler,
  completePasswordResetHandler,
  updatePasswordHandler,
  setPasswordHandler,
} = require('./modules/password');
const statement = require('./modules/statement');
const clientCallback = require('./client-callback');
const datastorage = require('./datastorage');
const leaderboard = require('./leaderboard');
const config = require('./config');
const { closeGameHandler, getGameFormHandler } = require('./modules/games/routes');
const { logoutHandler, logoutApiHandler, statisticsHandler } = require('./modules/session');
const { identifyHandler, identifyFailHandler, identifyOkHandler } = require('./modules/kyc');
const {
  startDepositHandler,
  depositOkHandler,
  depositFailHandler,
  getDepositFormHandler,
  getDepositInfoHandler,
  getPnpDepositInfoHandler,
  depositDoneHandler,
  payNPlayDepositProgressHandler,
  payNPlayLoginProgressHandler,
  payNPlayDepositHandler,
  payNPlayLoginHandler,
  completeRegistrationHandler,
} = require('./modules/deposit/routes');
const {
  removeLimitHandler,
  removeLimitAnonymouslyHandler,
  setLimitHandler,
  getLimitsHandler,
} = require('./modules/limits');
const {
  removeSelfexclusionHandler,
  setSelfexclusionHandler,
  removeSelfexclusionsHandler,
} = require('./modules/selfexclusion');
const {
  getClientConfigHandler,
  getInitialClientStateHandler,
  getInitialNonloggedinClientStateHandler,
  getLocalizationsHandler,
  getLocalizationFileHandler,
} = require('./modules/client-init');
const {
  getContentPageHandler,
  getDialogPageHandler,
  getContentIframeHandler,
} = require('./modules/content-pages');
const { registrationHandler } = require('./modules/register');
const { getBalanceHandler } = require('./modules/balance');
const {
  loginHandler,
  requestLoginPinCodeHandler,
  completePinCodeLoginHandler,
} = require('./modules/login');

const init = (app: express$Application<>) => {
  if (config.isDevelopment)
    app.use('/api/swagger', swagger.createSwaggerRouter('./brandserver-api.yaml'));

  app.all('*', brandserverMiddleware);

  app.get('/api/status/full', ping.statusHandler);
  app.get('/api/ping', ping.pingHandler);

  app.get('/api/jackpots', (req: express$Request, res: express$Response) => {
    const jackpots = _.mapValues(datastorage.jackpots(), (x) =>
      _.mapValues(x, (y, currency) => utils.money({ code: 'fi' })(y, currency, false)),
    );
    const jp = _.mapValues(datastorage.jackpots(), (y) => {
      const currency = y[req.context.currencyISO]
        ? req.context.currencyISO
        : utils.defaultCurrency();
      return utils.money({ code: 'fi' })(y[currency], currency, false);
    });
    return res.jsonp({ jp, jackpots });
  });

  app.get('/api/localizations', getLocalizationsHandler);
  app.get('/api/localizations/:file', getLocalizationFileHandler);

  app.post('/api/validate/phone', checkIpCountry, smsverification.verifyHandler);
  app.post('/api/activate/phone', checkIpCountry, ...smsRateLimiterMiddlewares, smsverification.sendPinCodeHandler);

  app.get('/api/statistics', statisticsHandler);

  app.post('/api/tc-accept', apiLoggedIn, tc.tcAcceptHandler);

  app.get('/api/content/:lang/:page', getContentPageHandler);
  app.get('/api/page/:lang/:page', getDialogPageHandler);
  app.get('/api/iframe/:lang/:page', getContentIframeHandler);

  app.post('/api/questionnaire/:id', checkIpCountry, apiLoggedIn, questionnaires.answerQuestionnaireHandler);

  app.post('/api/activation/resend', checkIpCountry, apiLoggedIn, async (req: express$Request, res: express$Response) => {
    await sendActivation(req);
    res.json({ ok: true });
  });

  app.get('/api/config', getClientConfigHandler);
  app.get('/api/init', checkIpCountry, apiLoggedIn, getInitialClientStateHandler);
  app.get('/api/init/nonloggedin', getInitialNonloggedinClientStateHandler);

  app.get(
    '/api/inbox',
    checkIpCountry,
    apiLoggedIn,
    async (req: express$Request, res: express$Response) => {
      try {
        const journey = await createJourney(req);
        const result = await notifications.forUser(req, journey);
        const notificationCount = await notifications.numberOfNotifications(req, journey);
        const callbacks = await clientCallback.expose(req);
        return res.json({
          notifications: result,
          update: {
            balance: journey.balance.ui,
            notificationCount,
            ...callbacks,
          },
        });
      } catch (e) {
        return handleError(req, res, e);
      }
    },
  );

  app.get(
    '/api/inbox/:id',
    checkIpCountry,
    apiLoggedIn,
    async (req: express$Request, res: express$Response) => {
      try {
        const journey = await createJourney(req);
        const notificationCount = await notifications.numberOfNotifications(req, journey);
        journey.tags.push(...['no_kyc', 'deposits']);
        const notification = await notifications.notificationForUser(req, journey, req.params.id);
        const callbacks = await clientCallback.expose(req);
        return res.json({
          notification,
          update: {
            balance: journey.balance.ui,
            notificationCount,
            ...callbacks,
          },
        });
      } catch (e) {
        return handleError(req, res, e);
      }
    },
  );
};

const initCommonRoutes = (app: express$Application<>) => {
  app.post('/api/login', checkIpCountry, loginHandler);
  app.post('/api/login/request', checkIpCountry, requestLoginPinCodeHandler);
  app.post('/api/login/complete', checkIpCountry, completePinCodeLoginHandler);

  app.post('/api/register', checkIpCountry, registrationHandler);
  app.post('/api/register/complete', checkIpCountry, completeRegistrationHandler);

  app.post('/api/password/reset/validate', checkIpCountry, validatePasswordResetHandler);
  app.post('/api/password/reset/request', checkIpCountry, ...emailRateLimiterMiddlewares, requestPasswordResetHandler);
  app.post('/api/password/reset/complete', checkIpCountry, completePasswordResetHandler);

  app.post('/api/deposit/pnp', checkIpCountry, payNPlayDepositHandler);
  app.get('/api/register/pending/:transactionKey', checkIpCountry, payNPlayDepositProgressHandler);

  app.post('/api/login/pnp', checkIpCountry, payNPlayLoginHandler);
  app.get('/api/login/pending/:transactionKey', checkIpCountry, payNPlayLoginProgressHandler);

  app.get('/api/games/form/:id', checkIpCountry, getGameFormHandler);

  app.post('/api/deposit', checkIpCountry, apiLoggedIn, startDepositHandler);

  app.get(
    '/api/deposit/process/:transactionKey',
    checkIpCountry,
    apiLoggedIn,
    (req: express$Request, res: express$Response) => payments.processJson(req, res),
  );
  app.get(
    '/api/deposit/pending/:transactionKey',
    checkIpCountry,
    apiLoggedIn,
    (req: express$Request, res: express$Response) => payments.process(req, res),
  );

  app.get('/api/deposit/form/:id', checkIpCountry, apiLoggedIn, getDepositFormHandler);
  app.get('/api/deposit/ok', checkIpCountry, apiLoggedIn, depositOkHandler);
  app.get('/api/deposit/fail', checkIpCountry, apiLoggedIn, depositFailHandler);
  app.post('/api/deposit/ok', checkIpCountry, apiLoggedIn, depositOkHandler);
  app.post('/api/deposit/fail', checkIpCountry, apiLoggedIn, depositFailHandler);
  app.get('/api/deposit', checkIpCountry, apiLoggedIn, getDepositInfoHandler);
  app.get('/api/pnpdeposit', checkIpCountry, getPnpDepositInfoHandler);
  app.get('/api/deposit-done', checkIpCountry, apiLoggedIn, depositDoneHandler);

  app.get('/api/subscription-v2', subscriptions.getSubscriptionsHandler);
  app.put('/api/subscription-v2', subscriptions.manageSubscriptionsHandler);
  app.post('/api/subscription-v2/snooze', subscriptions.snoozeSubscriptionsHandler);

  app.get('/api/profile', checkIpCountry, apiLoggedIn, profile.getProfileHandler);
  app.post('/api/profile', checkIpCountry, apiLoggedIn, profile.updateProfileHandler);

  app.post('/api/realitycheck', checkIpCountry, apiLoggedIn, profile.updateRealityCheckHandler);

  app.delete('/api/exclusion/:exclusionKey', removeSelfexclusionsHandler);
  app.post('/api/selfexclusion', checkIpCountry, apiLoggedIn, setSelfexclusionHandler);
  app.post('/api/selfexclusion/remove', removeSelfexclusionHandler);

  app.get('/api/limits', checkIpCountry, apiLoggedIn, getLimitsHandler);
  app.post('/api/limits', checkIpCountry, apiLoggedIn, setLimitHandler);
  app.delete('/api/limits/:limitId', checkIpCountry, apiLoggedIn, removeLimitHandler);
  app.delete('/api/limits/:limitId/anonym', removeLimitAnonymouslyHandler);

  app.post('/api/password', checkIpCountry, apiLoggedIn, updatePasswordHandler);
  app.post('/api/password/set', checkIpCountry, apiLoggedIn, setPasswordHandler);

  app.get('/api/withdraw', checkIpCountry, apiLoggedIn, withdraw.getWithdrawInfoHandler);
  app.delete(
    '/api/withdraw/:transactionKey',
    checkIpCountry,
    apiLoggedIn,
    withdraw.cancelWithdrawHandler,
  );
  app.get(
    '/api/withdraw/pending',
    checkIpCountry,
    apiLoggedIn,
    withdraw.getPendingWithdrawsHandler,
  );

  app.get('/api/statement', checkIpCountry, apiLoggedIn, statement.getStatementHandler);
  app.get('/api/statement/:month', checkIpCountry, apiLoggedIn, statement.getTransactionsHandler);

  app.post('/api/identify', checkIpCountry, apiLoggedIn, identifyHandler);
  app.get('/api/identify/fail', checkIpCountry, apiLoggedIn, identifyFailHandler);
  app.get('/api/identify/ok', checkIpCountry, apiLoggedIn, identifyOkHandler);

  app.post('/api/withdraw', checkIpCountry, apiLoggedIn, withdraw.requestWithdrawalHandler);

  app.get('/api/balance', checkIpCountry, apiLoggedIn, getBalanceHandler);

  app.post('/api/close-game/:sessionId', closeGameHandler);
  app.get('/logout', logoutHandler);
  app.post('/api/logout', logoutApiHandler);
  app.get('/api/leaderboard', checkIpCountry, apiLoggedIn, leaderboard.getLeaderboardHandler);
};

module.exports = {
  init,
  initCommonRoutes,
};
