/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi, PaymentiqConfig } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const country = require('countryinfo');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const config = require('../../../config');

const clean = require('./clean');
const cashier = require('./cashier');
const getMethodCofig = require('./methods');

const paymentiqConfig = config.providers.paymentiq;

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  logger.debug('PaymentIQ Cashier Deposit', depo);
  const {
    player,
    urls,
    deposit: { transactionKey, amount },
  } = depo;
  const brandConfig: PaymentiqConfig = paymentiqConfig.brands[player.brandId];
  const cashierConfig = cashier.makeConfig(
    'default',
    {
      method: 'deposit',
      environment: config.isProduction ? 'production' : 'test',
      userId: player.username,
      merchantId: brandConfig.merchantId,
      sessionId: `dp:${transactionKey}`,
      country: country.iso3(player.countryId),
      locale: player.languageId,
      amount: +money.formatMoney(amount).toFixed(2),
      attributes: {
        transactionKey,
        successUrl: urls.ok,
        pendingUrl: urls.ok,
        failureUrl: urls.failure,
        cancelUrl: urls.failure,
      },
    },
    await getMethodCofig(depo),
  );
  logger.debug('PIQ Cashier Config ', cashierConfig);
  return { html: cashier.create(cashierConfig, urls), requiresFullscreen: false };
};

const createWithdrawal = async (
  wd: WithdrawRequest,
  method: string,
  extraParams: any = {},
): Promise<WithdrawResponse> => {
  const { withdrawal, player } = wd;
  const brandConfig: PaymentiqConfig = paymentiqConfig.brands[player.brandId];
  const op = {
    amount: money.asFloat(withdrawal.amount),
    merchantId: brandConfig.merchantId,
    sessionId: `wd:${withdrawal.transactionKey}`,
    userId: player.username,
    accountId: withdrawal.accountParameters && withdrawal.accountParameters.paymentIqAccountId,
    attributes: {
      transactionKey: withdrawal.transactionKey,
    },
    ...extraParams,
  };
  const uri = `${brandConfig.apiUrl}/${method}/withdrawal/process`;
  logger.debug('Requesting withdrawal', op);
  const ip = wd.client.ipAddress;

  const { data: result } = await axios.request({
    method: 'POST',
    url: uri,
    headers: { 'PIQ-Client-IP': ip },
    data: op,
  });
  logger.debug('WD Processed', result);
  return {
    ok: result.success,
    message: result.message,
    reject: !result.success,
    id: result.txRefId,
    complete: false,
  };
};

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    logger.info('WD', wd);
    if (wd.withdrawal.paymentProvider === 'Directa24') {
      const nationalId = wd.player.nationalId?.replace(/\D/g, '');
      // $FlowFixMe[invalid-computed-prop]
      const nationalIdType = { PE: 'DNI', CL: 'RUT' }[wd.player.countryId];
      return createWithdrawal(wd, 'astropaybank', {
        nationalId,
        ...(nationalIdType ? { nationalIdType } : {}),
        accountType: wd.withdrawal.accountParameters?.accountType,
        bankCode: wd.withdrawal.accountParameters?.bankCode,
        bankBranch: wd.withdrawal.accountParameters?.bankBranch,
        bankAccount: wd.withdrawal.account,
      });
    }
    if (wd.withdrawal.paymentProvider === 'AstroPayCard') {
      return createWithdrawal(wd, 'astropaycard');
    }
    if (wd.withdrawal.paymentProvider === 'Pay4Fun') {
      return createWithdrawal(wd, 'pay4fun');
    }
    if (wd.withdrawal.paymentMethodName === 'CreditCard') {
      return createWithdrawal(wd, 'creditcard');
    }
    if (wd.withdrawal.paymentMethodName === 'InteracETransfer') {
      return createWithdrawal(wd, 'interac', {
        email: wd.player.email,
        mobile: wd.player.mobilePhone,
        service: 'InteracETransfer',
      });
    }
    if (wd.withdrawal.paymentMethodName === 'Trustly') {
      return createWithdrawal(wd, 'bank', {
        service: 'Trustly',
      });
    }
    if (
      wd.withdrawal.paymentProvider === 'Mifinity' &&
      wd.withdrawal.paymentMethodName === 'BankTransfer'
    ) {
      return createWithdrawal(wd, 'bankiban', {
        countryCode: country.iso3(wd.player.countryId),
        iban: wd.withdrawal.account.replace(/\s/, ''),
        bic: wd.withdrawal.accountParameters && wd.withdrawal.accountParameters.bic,
        beneficiaryName: `${clean(wd.player.firstName)} ${clean(wd.player.lastName)}`,
      });
    }
    return { ok: false, message: `Invalid payment method name ${wd.withdrawal.paymentMethodName}` };
  } catch (e) {
    logger.error('PaymentIQ WD failed:', e);
    if (e.ok !== null) {
      return { ok: e.ok, message: e.result };
    }
    return { ok: false, message: 'Check logs' };
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
