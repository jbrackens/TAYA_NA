/* @flow */
// https://www.skrill.com/fileadmin/content/pdf/Skrill_Quick_Checkout_Guide.pdf
// https://www.skrill.com/fileadmin/content/pdf/Skrill_Wallet_Checkout_Guide.pdf
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { Brand } from 'gstech-core/modules/types/backend';
import type { PaymentProviderApi } from '../../types';

const qs = require('querystring');
const { axios } = require('gstech-core/modules/axios');
const _ = require('lodash');
const { promisify } = require('util');
const { parseString } = require('xml2js');

const crypt = require('gstech-core/modules/crypt');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');
const paymentForm = require('../../shared/payment-form');

const skrillConfig = config.providers.skrill;

const parseXml = promisify(parseString);

const notificationUrl = (target: string) => config.server.public + target;

const paymentMethodMapping = {
  RapidTransfer: 'OBT',
  Sofort: 'SFT',
  PaySafe: 'PSC',
};

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  const { player, urls } = depo;
  // $FlowFixMe[invalid-computed-prop]
  const paymentMethod = paymentMethodMapping[depo.deposit.paymentMethod] || 'WLT';

  const fields = {
    pay_to_email: skrillConfig.account,
    transaction_id: depo.deposit.transactionKey,
    return_url: urls.ok,
    cancel_url: urls.failure,
    status_url: notificationUrl(`/api/v1/skrill/process/${player.brandId}`),
    return_url_target: 3,
    cancel_url_target: 3,
    language: player.languageId,
    user_id: player.id,
    pay_from_email: player.email,
    payment_methods: paymentMethod,
    amount: money.asFloat(depo.deposit.amount),
    currency: player.currencyId,
    firstname: player.firstName,
    lastname: player.lastName,
    address: player.address,
    postal_code: player.postCode,
    // phone_number Customer’s phone number. Only numeric values are accepted
    city: player.city,
    // country # 3 chars
    merchant_fields: 'pay_from_email,uid',
    uid: player.username,
    detail1_description: depo.brand.name,
    detail1_text: depo.deposit.transactionKey,
  };

  const requiresFullscreen = ['Sofort', 'RapidTransfer'].includes(depo.deposit.paymentMethod);
  const html = paymentForm.create(skrillConfig.gatewayURL, fields);
  const result: DepositResponse = {
    html,
    requiresFullscreen,
  };
  return result;
};

const prepareWithdrawal = async (
  currency: string,
  amount: Money,
  bnf_email: string,
  paymentId: Id,
  brand: Brand,
  transactionPayOut: boolean,
  mb_transaction_id: ?string,
): Promise<string> => {
   
  const form = {
    action: 'prepare',
    email: skrillConfig.account,
    password: crypt.md5(skrillConfig.password),
    currency,
    amount: money.asFloat(amount),
    ...(transactionPayOut ? { mb_transaction_id } : { bnf_email }),
    subject: paymentId,
    note: `You have just received money from ${brand.name}`,
    frn_trn_id: `${brand.name} ${paymentId}`,
  };

  const { data: res } = await axios.post(skrillConfig.paymentGatewayURL, qs.stringify(form), {
    responseType: 'text',
  });
  const { response } = await parseXml(res, { explicitArray: false, trim: true });
  logger.debug('Skrill prepareWithdrawal response', response);
  if (response.error != null) {
    return Promise.reject({
      error_message: response.error.error_msg,
    });
  }
  return response.sid;
};

const executeWithdrawal = async (sid: string): Promise<{id: string, ...}> => {
  const form = { action: 'transfer', sid };
  logger.debug('Skrill executeWithdrawal', form);
  const { data: res } = await axios.post(skrillConfig.paymentGatewayURL, qs.stringify(form), {
    responseType: 'text',
  });
  logger.debug('Skrill wd response', res);
  const { response } = await parseXml(res, { explicitArray: false, trim: true });
  if (response.error != null) {
    return Promise.reject({ error_message: response.error.error_msg || response.error });
  }
  const tx = response.transaction;
  if (tx.status !== '0' && tx.status !== '2' && tx.status_msg !== 'scheduled' && tx.status_msg !== 'pending') {
    return Promise.reject({ error_message: tx.status_msg });
  }
  return tx;
};

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  const { withdrawal, player } = wd;
  const transactionPayOut = _.includes(['RapidTransfer', 'Sofort'], withdrawal.paymentMethodName);
  const mbTransactionId = withdrawal.accountParameters && withdrawal.accountParameters.mb_transaction_id;

  try {
    const sid = await prepareWithdrawal(player.currencyId, withdrawal.amount, withdrawal.account, withdrawal.paymentId, wd.brand, transactionPayOut, mbTransactionId);
    const result = await executeWithdrawal(sid);
    return { ok: true, id: result.id, message: 'OK' };
  } catch (e) {
    logger.error('Skrill wd failed', e);
    if (e.error_message != null) {
      if (e.error_message === 'ALREADY_EXECUTED') {
        return { ok: true, id: `check ${withdrawal.paymentId}`, message: 'Already executed' }; // Special handling for ALREADY_EXECUTED status
      }
      return { ok: false, message: e.error_message, reject: true };
    }
    return { ok: false, message: 'Check logs' };
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
