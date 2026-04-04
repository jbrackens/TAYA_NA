/* @flow */
const { parseMoney } = require('gstech-core/modules/money-class');
const { getDepositOptions } = require('../../deposit-options');
const { getDepositLimits } = require('../limits');
const { getDepositInfo, deposit } = require('./index');
const { handleError } = require('../../extensions');
const { getNextUrlAfterLogin } = require('../login');
const {
  payNPlayDepositProgress,
  payNPlayLoginProgress,
  payNPlayDeposit,
  payNPlayLogin,
  completeRegistration,
} = require('../player');
const { updateDetails, redirectScript, redirectScriptWithDelay } = require('../../router-helpers');
const temporaryForm = require('../../payment/temporary-form');
const logger = require('../../logger');
const clientCallback = require('../../client-callback');
const { createJourney } = require('../../journey');
const api = require('../../api');
const { localize } = require('../localize');
const { formatMoney } = require('../../utils');
const { mapBonuses } = require('../bonus/helper');

const updateCommon = async (req: express$Request) => {
  const journey = await createJourney(req);
  const update = {
    details: await updateDetails(journey),
    banners: journey.updateBanners(req.context),
    balance: journey.balance.ui,
  };
  const callbacks = await clientCallback.expose(req);
  return {
    update: { ...update, ...callbacks },
  };
};

const startDepositHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const paymentMethod =
      req.body.paymentMethod === 'BankTransfer_Euteller' && req.body.selectedBank === 'siirto'
        ? 'Siirto_Euteller'
        : req.body.paymentMethod;
    const opts = { ...req.body, paymentMethod };
    const result = await deposit(
      req,
      paymentMethod,
      req.body.amount,
      req.body.bonusRuleID,
      req.body.paymentAccountId,
      opts,
    );
    return res.json(result);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const payNPlayDepositProgressHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const { params, query } = req;
    if (!query?.counter)
      logger.debug('payNPlayDepositProgressHandler starting.', { params, query });
    const [txKey, counter] = [params.transactionKey, +query.counter || 1];
    const logPrefix = `payNPlayDepositProgressHandler [${txKey}] #${counter}`;
    try {
      const success = await payNPlayDepositProgress(req, res, txKey);
      if (!success) logger.debug(`${logPrefix} cannot finalize deposit yet.`);
    } catch (err) {
      logger.warn(`${logPrefix} failed.`, err);
      return res.send(redirectScript('/'));
    }
    if (req.user) {
      const nextUrl = (await getNextUrlAfterLogin(req)) || '/loggedin/';
      logger.debug(`${logPrefix} complete.`, { user: req.user, nextUrl });
      return res.send(redirectScript(nextUrl));
    }
    return res.send(
      counter < 25 // try this many times
        ? redirectScriptWithDelay(
            3000, // with this delay in between
            `/api/register/pending/${encodeURIComponent(txKey)}?counter=${counter + 1}`,
          )
        : redirectScript('/'),
    );
  } catch (e) {
    return handleError(req, res, e);
  }
};

const payNPlayLoginProgressHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('payNPlayLoginProgressHandler starting.', {
      params: req.params,
      query: req.query,
    });
    const { transactionKey: txKey } = req.params;
    const logPrefix = `payNPlayLoginProgressHandler [${txKey}]`;
    try {
      await payNPlayLoginProgress(req, res, txKey);
    } catch (err) {
      logger.warn(`${logPrefix} failed.`, err);
      return res.send(redirectScript('/'));
    }
    const nextUrl = (await getNextUrlAfterLogin(req)) || '/loggedin/';
    logger.debug(`${logPrefix} complete.`, { nextUrl });
    return res.send(redirectScript(nextUrl));
  } catch (e) {
    return handleError(req, res, e);
  }
};

const payNPlayDepositHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<void> => {
  try {
    const { url, html, requiresFullscreen } = await payNPlayDeposit(
      req,
      parseMoney(req.body.amount),
      req.body.bonusId,
    );

    logger.debug('payNPlayDepositHandler result', { url, html, requiresFullscreen });

    let ReturnURL = url;
    if (html != null) {
      ReturnURL = await temporaryForm.addForm(html);
    }
    res.json({
      ok: true,
      ReturnURL,
      usesThirdPartyCookie: requiresFullscreen,
    });
  } catch (e) {
    handleError(req, res, e);
  }
};

const payNPlayLoginHandler = async (req: express$Request, res: express$Response): Promise<void> => {
  try {
    const { url, html, requiresFullscreen } = await payNPlayLogin(req);

    logger.debug('payNPlayLoginHandler result', { url, html, requiresFullscreen });

    let ReturnURL = url;
    if (html != null) {
      ReturnURL = await temporaryForm.addForm(html);
    }
    res.json({
      ok: true,
      ReturnURL,
      usesThirdPartyCookie: requiresFullscreen,
    });
  } catch (e) {
    handleError(req, res, e);
  }
};

const getDepositFormHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    return temporaryForm.showForm(req, res, req.params.id);
  } catch (e) {
    return res.send(redirectScript('/loggedin/myaccount/deposit-failed/'));
  }
};
const depositOkHandler = (req: express$Request, res: express$Response): Promise<express$Response> =>
  updateCommon(req).then(() => res.send(redirectScript('/loggedin/myaccount/deposit-done/')));

const depositFailHandler = (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> =>
  updateCommon(req).then((result) => {
    logger.warn('Deposit failed!', req.user.username, result);
    return res.send(redirectScript('/loggedin/myaccount/deposit-failed/'));
  });

const getDepositInfoHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const journey = await createJourney(req);
    const { depositMethods, limits } = await getDepositInfo(journey);
    const numDeposits = parseInt(journey.balance.NumDeposits);
    const callbacks = await clientCallback.expose(req);
    const update = {
      details: await updateDetails(journey),
      balance: journey.balance.ui,
      ...callbacks,
    };
    const limit = await getDepositLimits(req, limits);
    const depositOptions = await getDepositOptions(req, journey, depositMethods, limit);
    const x = {
      limit,
      numDeposits,
      depositMethods,
      depositOptions,
      update,
    };
    logger.debug('getDepositInfo', {
      balance: journey.balance.ui,
      numDeposits,
      username: req.user.username,
      activeBonus: journey.activeBonus,
      depositOptions,
    });
    return res.json(x);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const getPnpDepositInfoHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    if (req.context) req.context.currencyISO = 'EUR';
    const apiBonusList = await api.GetPnPDepositInfo();
    const bonusList = mapBonuses(req, apiBonusList)

    const depositOptions = bonusList.map((bonus) => ({
      minAmount: bonus.minAmount,
      maxAmount: bonus.maxAmount,
      percentage: bonus.percentage,
      id: `${bonus.id}`,
      bonusId: bonus.id,
      toggle: 'on',
      icon: 'coins',
      title: localize(req, 'forms.pnp.deposit-bonus.title') || '',
      fields: [
        {
          key: localize(req, 'my-account.deposit.wagering') || '',
          value: `${bonus.wageringRequirement}X`,
        },
        {
          key: localize(req, 'my-account.deposit.maxbonus') || '',
          value: formatMoney(req, bonus.maxAmount , false),
        },
      ],
    }));

    // without any depositMethods, since it is Single Payment method
    // Is this safety to have empty update object
    const x = { numDeposits: 0, depositOptions };

    logger.debug('getPPDepositInfo', { depositOptions });
    return res.json(x);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const depositDoneHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    const journey = await createJourney(req);
    const update = {
      details: await updateDetails(journey),
      balance: journey.balance.ui,
    };
    const callbacks = await clientCallback.expose(req);
    const x = {
      update: { ...update, ...callbacks },
    };
    return res.json(x);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const completeRegistrationHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<void> => {
  try {
    await completeRegistration(req, res, req.body);
    const nextUrl = await getNextUrlAfterLogin(req);
    res.json({ ok: true, nextUrl });
  } catch (e) {
    handleError(req, res, e);
  }
};

module.exports = {
  startDepositHandler,
  getDepositFormHandler,
  depositOkHandler,
  depositFailHandler,
  getDepositInfoHandler,
  getPnpDepositInfoHandler,
  depositDoneHandler,
  payNPlayDepositProgressHandler,
  payNPlayLoginProgressHandler,
  payNPlayDepositHandler,
  payNPlayLoginHandler,
  completeRegistrationHandler,
};
