/* @flow */
import type { AxiosXHRConfig } from 'axios';
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { BankData } from './types';

const { axios } = require('gstech-core/modules/axios');
const { formatMoney } = require('gstech-core/modules/money');

const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.luqapay;

const sendRequest = async (options: AxiosXHRConfig<any,any>) => {
  logger.debug('Luqapay request:', options);
  const { data: response } = await axios.request(options);
  logger.debug('Luqapay response:', response);
  return response;
};

const getDepositData = async (player: PlayerWithDetails, amount: Money): Promise<BankData[]> => {
  const tokenResponse = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/auth/merchant/token`,
    data: {
      apiKey: configuration[player.brandId].apiKey,
    },
  });

  const banksResponse = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/communityBankTransferAdvanced/banks`,
    headers: {
      Authorization: tokenResponse.accessToken,
    },
    data: {
      country: player.countryId,
    },
  });

  const response = await Promise.all((banksResponse.availableBanks || []).map(async b => {
    const amountsResponse = await sendRequest({
      method: 'POST',
      url: `${configuration[player.brandId].apiUrl}/v2/communityBankTransferAdvanced/availableAmount`,
      headers: {
        Authorization: tokenResponse.accessToken,
      },
      data: {
        maxAmount: formatMoney(amount),
        minAmount: '0',
        swiftCode: b.swiftCode,
      },
    });

    return { ...amountsResponse, swiftCode: b.swiftCode, bankName: b.bankName };
  }));

  return response;
};

const initializeDeposit = async (player: PlayerWithDetails, amount: number, transactionKey: string, activeAmountId: number, ipAddress: ?string, userAgent: ?string, swiftCode: string, ok: string, failure: string): Promise<string> => {
  const initDeposit = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/checkout/initialize`,
    data: {
      apiKey: configuration[player.brandId].apiKey,
      amount,
      country: player.countryId,
      currency: player.currencyId,
      city: player.city,
      dateOfBirth: player.dateOfBirth,
      defaultPaymentMethod: 'COMMUNITY_BANK',
      email: player.email,
      failRedirectUrl: failure,
      firstName: player.firstName,
      lastName: player.lastName,
      language: player.languageId.toUpperCase(),
      referenceNo: transactionKey,
      successRedirectUrl: ok,
    },
  });

  const response = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/checkout/pay`,
    headers: {
      Authorization: initDeposit.token,
    },
    data: {
      account: {
        bankCode: swiftCode,
      },
      customerInfo: {
        ip: ipAddress,
        agent: userAgent,
      },
      paymentMethod: 'COMMUNITY_BANK',
      activeAmountId,
    },
  });

  return response.redirectUrl;
};

const initializeWithdrawal = async (player: PlayerWithDetails, amount: number, transactionKey: string, account: string, swiftCode: string): Promise<{ transactionId: string, message: string, status: string }> => {
  const tokenResponse = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/auth/merchant/token`,
    data: {
      apiKey: configuration[player.brandId].apiKey,
    },
  });

  const withdrawalResponse = await sendRequest({
    method: 'POST',
    url: `${configuration[player.brandId].apiUrl}/v2/withdraw/bank`,
    headers: {
      Authorization: tokenResponse.accessToken,
    },
    data: {
      amount: formatMoney(amount),
      country: player.countryId,
      currency: player.currencyId,
      email: player.email,
      firstName: player.firstName,
      lastName: player.lastName,
      iban: account,
      referenceNo: transactionKey,
      swiftCode,
    },
  });

  return withdrawalResponse;
};

module.exports = {
  getDepositData,
  initializeDeposit,
  initializeWithdrawal,
};
