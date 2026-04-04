/* @flow */
import type { Balance } from './balance/types';

const errors = require('gstech-core/modules/errors/error-codes');
const moment = require('moment-timezone');
const _ = require('lodash');
const ccId = require('credit-card-identifier');
const api = require('../api');
const logger = require('../logger');
const configuration = require('../configuration');
const { formatMoney, money } = require('../money');
const { Money } = require('../money');
const { getVerificationStatus } = require('./kyc');
const { localize } = require('./localize');
const { getDetails } = require('./legacy-player');
const repository = require('../repository');
const { handleError } = require('../extensions');
const clientCallback = require('../client-callback');
const { updateDetails } = require('../router-helpers');

const currencyVars = configuration.requireProjectFile('data/currency-vars.json');

let _payments;
let _createJourney;

const createJourney = (...args: [express$Request, string[]] | [express$Request]) => {
  if (_createJourney == null) {
    const j = require('../journey');
    _createJourney = j.createJourney;
  }
  return _createJourney(...args);
};

const payments = () => {
  if (_payments == null) {
    _payments = require('../payment/payments');
  }
  return _payments;
};

const updateCommonWithWithdraws = async (req: express$Request) => {
  const pending = await getPendingWithdraws(req);
  const journey = await createJourney(req);
  const update = {
    details: await updateDetails(journey),
    banners: journey.updateBanners(req.context),
    balance: journey.balance.ui,
    pendingWithdraws: pending.length,
  };
  const callbacks = await clientCallback.expose(req);
  return {
    update: { ...update, ...callbacks },
    pending,
  };
};

const updateCommonWithWithdrawsCount = async (req: express$Request) => {
  const pending = await getNumberOfPendingWithdrawals(req);
  const journey = await createJourney(req);
  const update = {
    details: await updateDetails(journey),
    banners: journey.updateBanners(req.context),
    balance: journey.balance.ui,
    pendingWithdraws: pending,
  };
  const callbacks = await clientCallback.expose(req);
  return {
    update: { ...update, ...callbacks },
  };
};

const getWithdrawInfoHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const journey = await createJourney(req);
    const { options, accessStatus, wagering, withdrawalFeeConfiguration, withdrawalAllowed } = await getWithdrawOptions(req, journey.balance);

    const verificationStatus = await getVerificationStatus(req);
    return res.json({
      withdrawOptions: { options },
      accessStatus,
      currentBonus: wagering,
      update: {
        balance: journey.balance.ui,
      },
      withdrawalFee: !!(journey.balance.VIPLevel < 9 && withdrawalFeeConfiguration),
      withdrawalFeeConfiguration: (journey.balance.VIPLevel < 9 && withdrawalFeeConfiguration) || undefined,
      withdrawalAllowed,
      verificationStatus,
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

type WithdrawOptions = {
  accessStatus: {
    KycRequired: boolean,
    SowClearanceRequired: boolean,
  },
  options: Array<{
    account: string,
    copyrightText: any | void,
    currencyISO: string,
    currencySymbol: any | string,
    id: any,
    lowerLimit: any,
    lowerLimit_formatted: string,
    method: any | string,
    name: any,
    paymentAccountID: any,
    title: string,
    upperLimit: any,
    upperLimit_formatted: string,
  }>,
  wagering: {
    BonusWagerRequirement: void | string,
    BonusWagerRequirementAchievedPercentage: number,
    BonusWagerRequirementRemain: void | string,
    CurrencySymbol: any | string,
    CurrentBonusBalance: void | string,
    CurrentRealBalance: string,
    WageringComplete: any,
    forfeitable: any,
  },
  withdrawalAllowed: any,
  withdrawalFeeConfiguration: ?{
    withdrawalfee: any,
    withdrawalfeemax: any,
    withdrawalfeemin: any,
  },
};

const getWithdrawOptions = async (req: express$Request, balance: Balance): Promise<WithdrawOptions> => {
  const opts = await api.TransactionGetAllWithdrawOptions({ sessionKey: req.session.SessionKey });
  const optionList = opts.accounts.filter(x => !_.isEmpty(x.Description) && x.KYCChecked === 'true');
  const options = [];
  for (const option of Array.from(optionList)) {
    const currency = balance.CurrencyISO;
    const lowerLimit = Math.max(option.PlayerLowerLimit, currencyVars[currency].withdrawalmin);
    const upperLimit = Math.min(option.PlayerUpperLimit, balance.CurrentRealBalance);
    const cc = option.Description != null ? option.Description.replace(/\s/g, '') : undefined;
    const ccType = ccId(cc != null ? cc.replace(/\*/g, '0') : undefined);
    let method = '';
    let account = '';

    if (option.PaymentMethodName === 'CreditCard' && cc != null && ccType !== 'Unknown') {
      method = ccType;
      account = cc;
    }
    const result = localize(req, `my-account.deposit.payment-method.${option.PaymentMethodName.split('_')[0]}`);
    if (!_.isEmpty(option.Description)) {
      method = result || '';
      account = option.Description;
    }
    const title = `${method} (${account})`;
    options.push({
      id: option.PaymentMethodName,
      name: option.PaymentMethodName,
      lowerLimit: formatMoney(lowerLimit),
      upperLimit: formatMoney(upperLimit),
      lowerLimit_formatted: money(req, lowerLimit, currency),
      upperLimit_formatted: money(req, upperLimit, currency),
      paymentAccountID: option.PaymentAccountID,
      currencyISO: currency,
      currencySymbol: repository.currencySymbol(currency),
      method,
      account,
      title,
      copyrightText: payments().copyrightText(option.PaymentMethodName),
    });
  }
  const result = {
    options,
    wagering: {
      BonusWagerRequirementAchievedPercentage: (100 - opts.wagering.completed) / 100,
      BonusWagerRequirementRemain: opts.wagering.complete ? undefined : money(req, opts.wagering.wageringRequirement - opts.wagering.wagered, balance.CurrencyISO),
      BonusWagerRequirement: opts.wagering.complete ? undefined : money(req, opts.wagering.wageringRequirement, balance.CurrencyISO),
      CurrentBonusBalance: opts.wagering.complete ? undefined : money(req, balance.CurrentBonusBalance, balance.CurrencyISO),
      CurrentRealBalance: money(req, balance.CurrentRealBalance, balance.CurrencyISO),
      CurrencySymbol: repository.currencySymbol(balance.CurrencyISO),
      WageringComplete: opts.wagering.complete,
      forfeitable: opts.wagering.bonus,
    },
    accessStatus: opts.accessStatus,
    withdrawalAllowed: opts.withdrawalAllowed,
    withdrawalFeeConfiguration: opts.withdrawalFeeConfiguration ? {
      withdrawalfee: opts.withdrawalFeeConfiguration.withdrawalFee,
      withdrawalfeemin: opts.withdrawalFeeConfiguration.withdrawalFeeMin,
      withdrawalfeemax: opts.withdrawalFeeConfiguration.withdrawalFeeMax,
    } : undefined,
  };
  logger.debug('getWithdrawOptions', result);
  return result;
};

const withdraw = async (req: express$Request, paymentAccountID: string, rawAmount: string) => {
  const journey = await createJourney(req);
  const { CurrencyISO, Activated } = await getDetails(req)
  const { accessStatus } = await getWithdrawOptions(req, journey.balance);

  if (!Activated || accessStatus.KycRequired) throw errors.WITHDRAWALS_NOT_ALLOWED;
  if (accessStatus.SowClearanceRequired) throw errors.SOW_PENDING_CLEARANCE;

  const currency = CurrencyISO;
  const amount = Money.parse(rawAmount, currency);
  const noFee = journey.balance.VIPLevel >= 9;
  const data = { sessionKey: req.session.SessionKey, paymentAccountID, amount: amount.asFixed(), noFee };
  logger.debug('Withdraw', data);
  await api.TransactionWithdrawAmount(data);
};

const cancelWithdrawal = async (req: express$Request, transactionKey: string) => {
  await api.TransactionCancelWithdrawal({ sessionKey: req.session.SessionKey, transactionKey, reason: '-' });
};

const getPendingWithdraws = async (req: express$Request): Promise<Array<any>> => {
  const transactions = await api.TransactionGetPendingWithdrawalsForPlayer({ sessionKey: req.session.SessionKey });
  const ret = transactions.map((x) => ({
    Amount: money(req, x.Amount, x.CurrencyCode),
    CancelWithdrawal: x.CancelWithdrawal === 'true',
    PaymentMethodName:
      localize(
        req,
        `my-account.deposit.payment-method.${x.PaymentMethodName.split('_')[0]}`,
        false,
      ) || x.PaymentMethodName,
    UniqueTransactionID: x.UniqueTransactionID,
    Timestamp: moment.tz(x.Timestamp, 'Europe/Malta').locale(req.context.languageISO).format('lll'),
    WithdrawalFee: x.Fee > 0 ? money(req, x.Fee, x.CurrencyCode) : '',
  }));

  return _.compact<any, any>(ret);
};

const getNumberOfPendingWithdrawals = (req: express$Request): Promise<number> => getPendingWithdraws(req).then(x => x.length);

const cancelWithdrawHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    await cancelWithdrawal(req, req.params.transactionKey);
    const result = await updateCommonWithWithdraws(req);
    return res.json(result);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const getPendingWithdrawsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const pending = await getPendingWithdraws(req);
    return res.json(pending);
  } catch (e) {
    return handleError(req, res, e);
  }
};

const requestWithdrawalHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    await withdraw(req, req.body.paymentAccountID, req.body.amount);
    const result = await updateCommonWithWithdrawsCount(req);
    return res.json(result);
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = {
  cancelWithdrawal,
  withdraw,
  getWithdrawOptions,
  getNumberOfPendingWithdrawals,
  getPendingWithdraws,
  getWithdrawInfoHandler,
  cancelWithdrawHandler,
  requestWithdrawalHandler,
  getPendingWithdrawsHandler,
};
