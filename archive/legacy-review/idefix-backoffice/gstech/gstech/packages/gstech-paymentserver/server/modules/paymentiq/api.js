/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi, PaymentiqConfig } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const qs = require('querystring');

const country = require('countryinfo');
const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');

const config = require('../../../config');
const clean = require('./clean');
const paymentForm = require('../../shared/payment-form');

const paymentiqConfig = config.providers.paymentiq;

const reditectOnlyD24Methods = ['WebPay', 'MercadoPago', 'PagoEfectivo', 'D24Visa', 'D24MasterCard'];

const paymentMethodMapping = {
  VisaVoucher: 'visavoucher',
  CreditCard: 'creditcard',
  Giftcard: 'giftcard',
  BankTransfer: 'bank',
  InteracOnline: 'bank',
  InteracETransfer: 'bank',
  Pix: 'bank',
  Boleto: 'bank',
  Itau: 'bank',
  PagoEfectivo: 'bank',
  BCP: 'bank',
  WebPay: 'bank',
  MercadoPago: 'bank',
  D24Visa: 'bank',
  D24MasterCard: 'bank'
};

const getOptions = async (player: {
  accountClosed: boolean,
  accountSuspended: boolean,
  activated: boolean,
  additionalFields?: any,
  address: string,
  affiliateRegistrationCode: string,
  allowEmailPromotions: boolean,
  allowGameplay: boolean,
  allowSMSPromotions: boolean,
  allowTransactions: boolean,
  brandId: BrandId,
  city: string,
  countryId: string,
  createdAt: Date,
  currencyId: string,
  dateOfBirth: string,
  dd: { flagged: boolean, lockTime: ?Date, locked: boolean },
  email: string,
  firstName: string,
  gamblingProblem: boolean,
  id: number,
  languageId: string,
  lastName: string,
  loginBlocked: boolean,
  mobilePhone: string,
  nationalId: ?string,
  nationality?: string,
  numDeposits: number,
  partial: boolean,
  placeOfBirth?: string,
  pnp: boolean,
  postCode: string,
  preventLimitCancel: boolean,
  registrationSource: ?string,
  selfExclusionEnd: ?Date,
  tags: Array<string>,
  tcVersion: number,
  testPlayer: boolean,
  username: string,
  verified: boolean,
  realityCheckMinutes: number,
}, params: any) => {
  if (params.paymentAccountId) {
    const account = await client.getAccount(player.username, params.paymentAccountId);
    logger.debug('getOptions', params, account);
    if (account && account.parameters && account.parameters.paymentIqAccountId) {
      return {
        accountId: account.parameters.paymentIqAccountId,
        cvv: params.card && params.card.cvv,
        encCvv: params.card && params.card.encCvv,
      };
    }
  }
  logger.debug('getOptions account not found', params.card);
  return params.card;
};

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {  
  logger.debug('Payment IQ Deposit', depo);
  const { player } = depo;
  const nationalId = (depo.params?.nationalId || player.nationalId)?.replace(/\D/g, '')
  const brandConfig: PaymentiqConfig = paymentiqConfig.brands[player.brandId];
  let providerSpecificFields = {};
  const isInterac = depo.deposit.paymentProvider === 'Interac';
  const isDirecta = depo.deposit.paymentProvider === 'Directa24';
  if (isInterac) {
    providerSpecificFields = { service: depo.deposit.paymentMethod };
  } else if (isDirecta) {
    const service = {
      Pix: 'IX',
      Boleto: 'BL',
      Itau: 'I',
      PagoEfectivo: 'EF',
      BCP: 'BC',
      WebPay: 'WP',
      MercadoPago: 'ME',
      D24Visa: 'VI',
      D24MasterCard: 'MC',
      // $FlowFixMe[invalid-computed-prop]
    }[depo.deposit.paymentMethod];
    if (!service) throw new Error(`No mappable service for payment method '${depo.deposit.paymentMethod}' found.`);
    providerSpecificFields = { service, nationalId };
  }

  const p = await getOptions(player, depo.params);
  const op = {
    ...p,
    amount: money.formatMoney(depo.deposit.amount).toFixed(2),
    merchantId: brandConfig.merchantId,
    sessionId: `dp:${depo.deposit.transactionKey}`,
    userId: player.username,
    attributes: {
      nationalId, // tell PIQ to send this back to us upon transfer
      transactionKey: depo.deposit.transactionKey,
      successUrl: depo.urls.ok,
      failureUrl: depo.urls.failure,
      pendingUrl: depo.urls.ok,
    },
    ...providerSpecificFields
  };

  const ip = depo.client.ipAddress;

  // $FlowFixMe[invalid-computed-prop]
  const type = paymentMethodMapping[depo.deposit.paymentMethod];
  if (!type) throw new Error(`Payment method '${depo.deposit.paymentMethod}' not found in the mapping`);

  logger.debug('PaymentIQ request', op, ip);
  const { data: response } = await axios.request({
    method: 'POST',
    url: `${brandConfig.apiUrl}/${type}/deposit/process`,
    data: op,
    headers: { 'PIQ-Client-IP': ip },
  });

  if (response.success) {
    if (response.redirectOutput != null) {
      logger.debug('Redirecting to 3D', response.redirectOutput);
      const form = response.redirectOutput;
      const requiresFullscreen =
        isInterac ||
        form.container !== 'iframe' ||
        (isDirecta && reditectOnlyD24Methods.includes(depo.deposit.paymentMethod));

      if (form.html != null) {
        return {
          html: form.html,
          requiresFullscreen,
        };
      }
      if (form.method === 'GET') {
        const p2 = qs.stringify(form.parameters || {});
        const s = form.url + (p2 !== '' ? '?' : '') + p2;
        return {
          url: s,
          requiresFullscreen,
        };
      }

      return {
        html: paymentForm.create(form.url, form.parameters || {}, form.method),
        requiresFullscreen,
      };
    }

    return {
      url: depo.urls.ok,
      requiresFullscreen: false,
    };
  }
  logger.warn('PaymentIQ deposit failed', response);
  return {
    url: depo.urls.failure,
    requiresFullscreen: false,
  };
};

const createWithdrawal = async (wd: WithdrawRequest, method: string, extraParams: any = {}): Promise<WithdrawResponse> => {
  const { withdrawal, player } = wd;
  const brandConfig: PaymentiqConfig = paymentiqConfig.brands[player.brandId];
  const op = { amount: money.asFloat(withdrawal.amount),
    merchantId: brandConfig.merchantId,
    sessionId: `wd:${withdrawal.transactionKey}`,
    userId: player.username,
    accountId: withdrawal.accountParameters && withdrawal.accountParameters.paymentIqAccountId,
    attributes: {
      transactionKey: withdrawal.transactionKey,
    },
    ...extraParams };
  const uri = `${brandConfig.apiUrl}/${method}/withdrawal/process`
  logger.debug('Requesting withdrawal', op);
  const ip = wd.client.ipAddress;

  const { data: result } = await axios.request({
    method: 'POST',
    url: uri,
    headers: { 'PIQ-Client-IP': ip },
    data: op,
  });
  logger.debug('WD Processed', result);
  return { ok: result.success, message: result.message, reject: !result.success, id: result.txRefId, complete: false };
};

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    logger.info("WD", wd)
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
    if (wd.withdrawal.paymentProvider === 'Mifinity' && wd.withdrawal.paymentMethodName === 'BankTransfer') {
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
