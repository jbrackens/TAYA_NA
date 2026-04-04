/* @flow */
import type { CMoney, Money } from 'gstech-core/modules/money-class';
import type { Journey, LegacyPlayer } from '../api';

const _ = require('lodash');
const constants = require('gstech-core/modules/constants');
const configuration = require('../configuration');
const logger = require('../logger');
const fees = require('./payment-fee');
const utils = require('../utils');
const api = require('../api');
const datastorage = require('../datastorage');
const temporaryForm = require('./temporary-form');
const { moneyFrom } = require('../money');
const clientCallback = require('../client-callback');
const { getFullBalance } = require('../modules/balance');

const mappedFinnishBanks = constants.finnishBanks.map(({ id, name, logo }) => ({
  id,
  bank_name: name,
  logo,
}));

const paymentMethodAttributes: any = {
  BankTransfer_Euteller: {
    formType: 'entercash',
    formOptions() {
      return mappedFinnishBanks;
    },
  },
  BankTransfer_Trustly: {
    formType: 'entercash',
    formOptions() {
      return mappedFinnishBanks;
    },
  },
  BrazilBank_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24BrazilBanks.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  BrazilVoucher_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24BrazilVouchers.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  PeruBank_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24PeruBanks.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  PeruVoucher_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24PeruVouchers.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  ChileBank_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24ChileBanks.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  ChileVoucher_Directa24: {
    formType: 'iframe',
    formOptions() {
      return constants.d24ChileVouchers.map(({ id, name }) => ({ id, bank_name: name }));
    },
  },
  Neteller_Neteller: { formType: 'neteller' },
  CreditCard_EMP: { formType: 'creditcard' },
  CreditCard_Bambora: { formType: 'iframe' },
  InteracOnline_Interac: { formType: 'iframe' },
  InteracETransfer_Interac: { formType: 'iframe' },
};

const paymentMethodExtraAttributes = {
  InteracOnline: { copyrightText: '®Trade-mark of Interac Corp. Used Under license.' },
  InteracETransfer: { copyrightText: '®Trade-mark of Interac Corp. Used Under license.' },
};

export type PaymentMethodProvider = {
  startPayment: (
    req: express$Request,
    details: LegacyPlayer,
    amount: Money,
    transactionKey: string,
    customOptions: any,
    params: any,
  ) => Promise<any>,
};

const backendApi: PaymentMethodProvider = {
  startPayment: async (
    req: express$Request,
    details: LegacyPlayer,
    amount: Money,
    transactionKey: string,
    customOptions: any,
    params: any,
  ) => {
    const client = {
      ipAddress: utils.getRemoteAddress(req),
      userAgent: req.headers['user-agent'],
      isMobile: req.context.mobile,
    };
    const { url, html, requiresFullscreen } = await api.executeDeposit(
      req,
      params.paymentAccountId,
      transactionKey,
      customOptions,
      configuration.baseUrl(`/api/deposit/pending/${transactionKey}`),
      configuration.baseUrl('/api/deposit/fail'),
      client,
    );
    logger.debug('executeDeposit result', { url, html, requiresFullscreen });
    let ReturnURL = url;
    if (html != null) {
      ReturnURL = await temporaryForm.addForm(html);
    }
    return {
      ReturnURL,
      usesThirdPartyCookie: requiresFullscreen,
    };
  },
};

const startPayment = (
  req: express$Request,
  details: LegacyPlayer,
  paymentMethod: string,
  amount: Money,
  transactionKey: string,
  customOptions: any,
  params: any,
): Promise<any> =>
  backendApi.startPayment(req, details, amount, transactionKey, customOptions, params);

const process = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  logger.debug('Process deposit', req.params);
  const txKey = req.params.transactionKey;
  const txUrl = `/loggedin/myaccount/deposit-process/${encodeURIComponent(txKey)}`;
  const html = `
    <html>
      <head>
        <script>window.top.location='${txUrl}';</script>
      </head>
    <html>`;
  logger.debug('Returning deposit process html', html);
  return res.send(html);
};

const processJson = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('Process deposit', req.user.username, req.params);
    const { deposit } = await api.getDeposit(req.params.transactionKey);
    const flag = await datastorage.hasFlag('deposit-tx', req.params.transactionKey);
    logger.debug('process Deposit!', req.user.username, deposit, flag);
    if ((deposit.status === 'created' || deposit.status === 'pending') && flag) {
      const ret = { status: 'pending' };
      logger.debug('Deposit process pending return!', req.user.username, ret);
      return res.json(ret);
    }
    if (deposit.status === 'complete') {
      const balance = await getFullBalance(req);
      const numDeposits = balance.NumDeposits;
      const value = moneyFrom(deposit.amount, req.user.details.CurrencyISO)
        .asBaseCurrency()
        .value();
      if (numDeposits === 1) {
        await clientCallback.pushEvent(req, { event: 'ndc', value });
      } else if (numDeposits > 1) {
        await clientCallback.pushEvent(req, { event: 'deposit', value });
      }
      const ret = {
        ok: true,
        status: 'complete',
        numDeposits,
      };
      logger.debug('Deposit process complete return!', req.user.username, ret);
      return res.json(ret);
    }
  } catch (e) {
    logger.error('Deposit processJSon failed', e);
  }
  return res.json({ status: 'failed' });
};

const disallowBonuses = (req: express$Request, paymentMethod: string): boolean =>
  _.includes(['Neteller_Neteller', 'Skrill_Skrill'], paymentMethod) &&
  _.includes(['SE', 'DE', 'NL', 'AT', 'KZ'], req.user.details.CountryISO) &&
  req.user.numDeposits < 2 &&
  !_.includes(req.user.details.Tags, 'payments-allow-all');

const paymentFormType = (paymentMethod: string): any | string =>
  (paymentMethodAttributes[paymentMethod] != null
    ? paymentMethodAttributes[paymentMethod].formType
    : undefined) || 'iframe';
const copyrightText = (paymentMethod: string): any | void =>
  // $FlowFixMe[invalid-computed-prop]
  paymentMethodExtraAttributes[paymentMethod] != null
    ? paymentMethodExtraAttributes[paymentMethod].copyrightText
    : undefined;

const priority = (
  req: express$Request,
  paymentMethod: string,
  accountReference: ?string,
  originalIndex: number,
): number => {
  const add = accountReference != null ? 0 : 10; // Used account is prioritized before normal ones

  let prio = originalIndex + 10;
  if (paymentMethod === 'Trustly_Trustly' && req.context.countryISO === 'FI') {
    prio = 100; // Trustly is last in FI
  }
  return add + prio;
};

const paymentOptions = (paymentMethod: string): any | void => {
  const op = paymentMethodAttributes[paymentMethod];
  if (op != null && op.formOptions != null) {
    return op.formOptions();
  }
};

const calculateDepositFee = (journey: Journey, paymentMethod: string, amount: CMoney): CMoney =>
  fees.calculateDepositFee(journey, paymentMethod, amount);
const getDepositFee = (journey: Journey, paymentMethod: string): number =>
  fees.getDepositFee(journey, paymentMethod);

module.exports = {
  process,
  startPayment,
  paymentFormType,
  copyrightText,
  priority,
  paymentOptions,
  calculateDepositFee,
  getDepositFee,
  processJson,
  disallowBonuses,
};
