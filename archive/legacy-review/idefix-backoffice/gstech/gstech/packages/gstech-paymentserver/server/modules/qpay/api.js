/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const countries = require('i18n-iso-countries');

const money = require('gstech-core/modules/money');
const logger = require('gstech-core/modules/logger');
const backend = require('gstech-core/modules/clients/backend-payment-api');
const paymentForm = require('../../shared/payment-form');
const config = require('../../../config');
const { encrypt } = require('./crypto');
const Withdraw =require('./Withdraw');

const configuration = config.providers.qpay;

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  const { isMobile } = depositRequest.client;
  const { transactionKey, amount } = depositRequest.deposit;
  const { player, urls } = depositRequest;

  const callbackData = {
    transactionKey,
  };

  const encrypted = encrypt(callbackData);

  const txn_details = {
    agId: configuration.agId,
    meId: configuration.meId,
    order_no: transactionKey,
    Amount: money.asFloat(amount),
    Country: countries.alpha2ToAlpha3(player.countryId),
    Currency: player.currencyId,
    txn_type: 'SALE',
    success_url: `${config.server.public}/api/v1/qpay/${encodeURIComponent(encrypted)}`,
    failure_url: urls.failure,
    Channel: isMobile ? 'MOBILE' : 'WEB',
  };

  logger.debug('QPay deposit', { depositRequest, txn_details });

  const pg_details = {
    pg_id: '',
    Paymode: '',
    Scheme: '',
    emi_months: '',
  };

  const card_details = {
    card_no: '',
    card_name: '',
    exp_month: '',
    exp_year: '',
    cvv2: '',
  };

  const cust_details = {
    cust_name: '',
    email_id: '',
    mobile_no: '',
    unique_id: '',
    is_logged_in: 'Y',
  };

  const bill_details = {
    bill_address: '',
    bill_city: '',
    bill_state: '',
    bill_country: '',
    bill_zip: '',
  };

  const ship_details = {
    ship_address: '',
    ship_city: '',
    ship_state: '',
    ship_country: '',
    ship_zip: '',
    ship_days: '',
    address_count: '',
  };

  const item_details = {
    item_count: '',
    item_value: '',
    item_category: '',
  };

  const other_details = {
    udf_1: '',
    udf_2: '',
    udf_3: '',
    udf_4: '',
    udf_5: '',
  };

  const form = {
    me_id: configuration.meId,
    txn_details: encrypt(txn_details),
    pg_details: encrypt(pg_details),
    card_details: encrypt(card_details),
    cust_details: encrypt(cust_details),
    bill_details: encrypt(bill_details),
    ship_details: encrypt(ship_details),
    item_details: encrypt(item_details),
    other_details: encrypt(other_details),
  };

  await backend.updateDeposit(player.username, depositRequest.deposit.transactionKey, {
    depositParameters: {
      ok: urls.ok,
      failure: urls.failure,
    },
    message: 'add ok and failure urls',
  });

  const result: DepositResponse = {
    requiresFullscreen: true,
    html: paymentForm.create(configuration.url, form),
  };
  return result;
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    const { player, withdrawal: { transactionKey, amount, accountParameters }, client: { ipAddress, userAgent } } = withdrawRequest;
    if (!accountParameters) {
      throw new Error('no accountParameters defined for the player. Withdrawal not possible');
    }
    const versionCheck = await Withdraw.versionCheck();

    const { key } = versionCheck.header;
    const customKey = Buffer.from(key, 'base64');

    await Withdraw.loadMoney(player, transactionKey, ipAddress, userAgent, customKey);
    const payoutWithoutBeneficiary = await Withdraw.payoutWithoutBeneficiary(player, amount, accountParameters, customKey);

    const success = payoutWithoutBeneficiary.response.description === 'Successful';

    const withdrawResponse: WithdrawResponse = {
      ok: true,
      message: payoutWithoutBeneficiary.response.description,
      reject: !success,
      complete: success,
      transaction: payoutWithoutBeneficiary.transaction,
      id: payoutWithoutBeneficiary.transaction.otp_ref_number,
    };
    return withdrawResponse;
  } catch (e) {
    logger.error('QPay withdraw error', e);
    const withdrawResponse: WithdrawResponse = { ok: false, message: e.message, reject: true, complete: false };
    return withdrawResponse;
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
