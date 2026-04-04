/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
  IdentifyRequest,
  IdentifyResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { EutellerConfig, PaymentProviderApi } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const _ = require('lodash');
const money = require('gstech-core/modules/money');
const logger = require('gstech-core/modules/logger');
const { depositSignature, depositSiirtoSignature, withdrawSignature, wdRequestSignature, signinSignature } = require('./signature');
const config = require('../../../config');
const siirtoProgressPage = require('./siirto-progress');
const siirtoFailurePage = require('./siirto-error');
const { withdrawStatus, checkPhoneValidity } = require('./api-client');

const eutellerConfig: EutellerConfig = config.providers.euteller;

const siirtoDeposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  const p = depositSiirtoSignature({
    customer: eutellerConfig.deposit.username,
    orderid: depo.deposit.paymentId,
    amount: money.asFloat(depo.deposit.amount),
    'end_user[login]': depo.player.username,
    'end_user[category]': '0',
    'end_user[device]': depo.client && depo.client.isMobile ? '1' : '0',
    'end_user[phoneNumber]': depo.player.mobilePhone,
    'addfield[email]': depo.player.email,
    'addfield[siteName]': depo.brand.name,
    'addfield[firstName]': depo.player.firstName,
    'addfield[lastName]': depo.player.lastName,
    'addfield[username]': depo.player.username,
    'addfield[phoneNumber]': depo.player.mobilePhone,
    'addfield[transactionKey]': depo.deposit.transactionKey,
  });

  // const r = { followAllRedirects: true };
  const { data: response } = await axios.post(`https://payment.euteller.com/siirto/v1?${p}`);

  logger.debug('Siirto response', response);

  if (response.state === 0) {
    return {
      html: siirtoProgressPage(depo.urls.ok, depo.urls.failure, `+${depo.player.mobilePhone}`),
      requiresFullscreen: false,
    };
  }

  if (response.state_text === 'PROXY_NOT_FOUND') {
    return {
      html: siirtoFailurePage(depo.urls.ok, depo.urls.failure, `+${depo.player.mobilePhone}`),
      requiresFullscreen: false,
    };
  }

  return {
    url: depo.urls.failure,
    requiresFullscreen: false,
  };
};

const regularDeposit = (depo: DepositRequest): DepositResponse => {
  const p = depositSignature({
    customer: eutellerConfig.deposit.username,
    orderid: depo.deposit.paymentId,
    amount: money.asFloat(depo.deposit.amount),
    'end_user[login]': depo.player.username,
    'end_user[category]': '0',
    'end_user[device]': depo.client && depo.client.isMobile ? '1' : '0',
    'end_user[phoneNumber]': depo.player.mobilePhone,
    successurl: depo.urls.ok,
    failedurl: depo.urls.failure,
    prepare: depo.params.selectedBank,
    // country: depo.player.countryId,
    // currency: depo.player.currencyId,
    'addfield[username]': depo.player.username,
    'addfield[email]': depo.player.email,
    'addfield[transactionKey]': depo.deposit.transactionKey,
    'addfield[siteName]': depo.brand.name,
  });

  const base = 'https://payment.euteller.com/v2';
  return {
    url: `${base}?${p}`,
    requiresFullscreen: true,
  };
};

const deposit = async (depo: DepositRequest): Promise<DepositResponse> => {
  const siirto = depo.deposit.paymentMethod === 'Siirto';
  if (siirto) {
    return siirtoDeposit(depo);
  }
  return regularDeposit(depo);
};

const withdraw = async (wd: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    const siirto = wd.withdrawal.paymentMethodName === 'Siirto';

    const body: any = {
      customer: eutellerConfig.deposit.username,
      transactionid: wd.withdrawal.paymentId,
      amount: money.asFloat(wd.withdrawal.amount),
      'end_user[login]': wd.player.username,
      'end_user[firstName]': wd.player.firstName,
      'end_user[lastName]': wd.player.lastName,
      'end_user[email]': wd.player.email,
      'end_user[streetAddress]': wd.player.address,
      'end_user[postalAddress]': `${wd.player.postCode} ${wd.player.city}`,
      'end_user[country]': wd.player.countryId,
      'end_user[phoneNumber]': wd.player.mobilePhone,
      apimode: '1',
      notificationurl: `${config.server.public}/api/v1/euteller/wd/${wd.withdrawal.transactionKey}/${encodeURIComponent(wd.player.username)}/${wdRequestSignature(wd.withdrawal.transactionKey, wd.player.username)}`,
      'extra_fields[siteName]': wd.brand.name,
      'extra_fields[username]': wd.player.username,
      'extra_fields[transactionKey]': wd.withdrawal.transactionKey,
    };

    if (siirto) {
      const number = wd.withdrawal.account.replace(/^\+/, '').replace(/^3580/, '358');
      const phoneCheckResult = await checkPhoneValidity(number);
      if (!phoneCheckResult.userRegistered) {
        const result: WithdrawResponse = { ok: false, message: `Phone number ${number} cannot be validated with euteller api`, reject: true, complete: false };
        return result;
      }
      body['end_user[phoneNumber]'] = wd.player.mobilePhone;
      body['extra_fields[routing]'] = 'siirto';
    } else {
      const iban_hashed = wd.withdrawal.accountParameters && wd.withdrawal.accountParameters.iban_hashed;
      if (iban_hashed && iban_hashed !== 'EUT') {
        body['end_user[iban]'] = iban_hashed;
        body['extra_fields[iban]'] = iban_hashed;
      } else {
        body['end_user[iban]'] = wd.withdrawal.account.replace(/\s/, '');
        body['extra_fields[iban]'] = wd.withdrawal.account.replace(/\s/, '');
      }
    }
    const { data: response } = await axios.request({
      method: 'POST',
      url: `https://payment.euteller.com/withdraw/v1?${withdrawSignature(body)}`,
      timeout: 1000 * 60 * 2, // set timeout to 2 minutes as it might take looong
    });
    logger.debug('Response from Euteller withdrawal', response);
    if (response.status !== false) {
      const result: WithdrawResponse = { ok: true, message: 'WD submitted', reject: false, id: response.bankreference, complete: false };
      return result;
    }

    if (response.error && _.find(response.error, ({ transactionid }) => transactionid === 'transactionid already used')) {
      const wdStatus = await withdrawStatus(wd.withdrawal.paymentId);
      const status = wdStatus.status_code;
      if (status === 200 || status === 199) {
        const result: WithdrawResponse = { ok: true, message: 'WD submitted with network failure', reject: false, id: wdStatus.response.bankref, complete: status === 200 };
        return result;
      }
    }
    const result: WithdrawResponse = { ok: false, message: JSON.stringify(response.error), reject: true, complete: true };
    return result;
  } catch (e) {
    logger.error('Euteller WD failed:', e);
    return { ok: false, message: 'Check logs' };
  }
};

const identify = async (identifyRequest: IdentifyRequest): Promise<IdentifyResponse> => {  
  const p = signinSignature({
    customer: eutellerConfig.deposit.username,
    successurl: identifyRequest.urls.ok,
    failedurl: identifyRequest.urls.failure,
    ipnurl: `${config.server.public}/api/v1/euteller/identify`,
    lang: identifyRequest.player.languageId,
    'addfield[username]': identifyRequest.player.username,
    'addfield[email]': identifyRequest.player.email,
    'addfield[siteName]': identifyRequest.brand.name,
    'prefill[phoneNumber]': `+${identifyRequest.player.mobilePhone}`,
    'prefill[email]': identifyRequest.player.email,
  });

  const { data: response } = await axios.post(`${eutellerConfig.identifyApi}/signin?${p}`);
  if (response.status === 'OK') {
    return {
      html: response.data.layout,
      requiresFullscreen: true,
    };
  }
  return {
    url: identifyRequest.urls.failure,
    requiresFullscreen: false,
  };
};

const api: PaymentProviderApi = { deposit, withdraw, identify };
module.exports = api;
