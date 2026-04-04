/* @flow */
import type { EutellerConfig } from '../../types';

const moment = require('moment-timezone');
const { axiosRetry } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');

const config = require('../../../config');
const { sha256 } = require('./signature');

const eutellerConfig: EutellerConfig = config.providers.euteller;

const url = 'https://payment.euteller.com/merchantapi/v1';

export type MerchantAPIAction = 'paymentcheck' | 'withdrawstatus' | 'balancecheck' | 'paymentlist';
export type ParametersType = {[string]: (string | {[string]: string})};

const calculateSignature = (action: MerchantAPIAction, parameters: ParametersType) => {
  if (action === 'paymentcheck') {
    return sha256([eutellerConfig.merchant.password, parameters.orderid, action, eutellerConfig.merchant.username].join(''));
  } if (action === 'withdrawstatus') {
    return sha256([eutellerConfig.merchant.password, parameters.orderid, action, eutellerConfig.merchant.username].join(''));
  } if (action === 'balancecheck') {
    return sha256([eutellerConfig.merchant.password, action, eutellerConfig.merchant.username].join(''));
  } if (action === 'paymentlist') {
    return sha256([eutellerConfig.merchant.password, action, parameters.startTs, parameters.endTs].join(''));
  }
  throw new Error('Unsupported action');
};

const req = async (action: MerchantAPIAction, parameters: any) => { // TODO: parameters type must be ParametersType. If fails the new flow rules
  const security = calculateSignature(action, parameters);
  const qs = { customer: eutellerConfig.merchant.username, action, security, ...parameters };
  const { data: response } = await axiosRetry(url, {
    params: qs,
    timeout: 1000 * 60 * 2, // set timeout to 2 minutes as it might take looong
  });
  logger.debug('Euteller MerchantAPI', action, parameters, response);
  return response;
};

export type MerchantAPIResponse = {
  status: string,
  status_code: number,
  action: MerchantAPIAction,
  customer: string,
  response_date_time: string,
};

export type PaymentCheckResponse = {
  response: {
    bankref: string,
    account_owner: ?string,
  }
} & MerchantAPIResponse;

export type BalanceResponse = {
  balance: string,
  withdraw_balance: string,
  balance_combined: string,
  balance_date_time: string,
  currency: string,
} & MerchantAPIResponse;

const paymentCheck = (paymentId: Id): Promise<PaymentCheckResponse> =>
  req('paymentcheck', { orderid: String(paymentId) });

export type WithdrawStatusResponse = {
  response: {
    orderid: string,
    bankref: string,
    amount: string,
  },
} & MerchantAPIResponse;

const withdrawStatus = (paymentId: Id): Promise<WithdrawStatusResponse> =>
  req('withdrawstatus', { orderid: String(paymentId) });

const balanceCheck = (): Promise<BalanceResponse> =>
  req('balancecheck', {});

const paymentList = (startTime: Date, endTime: Date): Promise<PaymentCheckResponse & WithdrawStatusResponse & BalanceResponse> =>
  req('paymentlist', {
    startTs: String(startTime.getTime() / 1000),
    endTs: String(endTime.getTime() / 1000),
    fields: {
      full_amount: '1',
      provision: '1',
      merchant_amount: '1',
      bank_reference: '1',
      settlement_id: '1',
      account_owner: '1',
    },
  });

const userData = async (mobilePhone: string): Promise<any> => {
  const Customer = eutellerConfig.deposit.username;
  const Date = moment().toISOString();
  const str = [Date, Customer, eutellerConfig.deposit.password].join('');
  const headers = {
    Customer,
    Date,
    Authorization: sha256(str),
  };
  const url2 = `${eutellerConfig.identifyApi}/auth/user/${encodeURIComponent(mobilePhone)}`;
  const { data: response } = await axiosRetry.get(url2, { headers });
  return response;
};

const checkPhoneValidity = async (mobilePhone: string): Promise<any> => {
  const customer = eutellerConfig.deposit.username;
  const date = moment().toISOString();

  const headers = {
    Customer: customer,
    Date: date,
    Authorization: sha256([date, customer, eutellerConfig.deposit.password].join('')),
  };
  const validationUrl = `${eutellerConfig.paymentApi}/siirto/proxyStatus/${encodeURIComponent(mobilePhone)}`;

  logger.debug('checkPhoneValidity', validationUrl, headers);
  const { data: response } = await axiosRetry.get(validationUrl, { headers });
  return response;
};

module.exports = {
  paymentCheck,
  withdrawStatus,
  balanceCheck,
  paymentList,
  userData,
  checkPhoneValidity,
};
