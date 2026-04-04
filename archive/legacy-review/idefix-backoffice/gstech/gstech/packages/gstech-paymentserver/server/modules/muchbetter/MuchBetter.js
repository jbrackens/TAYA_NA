/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const config = require('../../../config');

const muchbetterConfig = config.providers.muchbetter;

const depositRequest = async (player: PlayerWithDetails, account: string, amount: Money, transactionKey: string, transactionReference: string): Promise<any> => {
  const { walletHost, walletPort, authorizationToken, merchantAccountId } = muchbetterConfig;

  const options = {
    method: 'POST',
    url: `https://${walletHost}:${walletPort}/merchant/pull`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorizationToken}`,
    },
    data: {
      amount: money.asFloat(amount),
      currency: player.currencyId,
      idType: 'PHONE',
      idValue: account,
      merchantAccountId,
      transactionReference,
      merchantInternalRef: transactionKey,
      optionalParams: {
        brandName: player.brandId,
        callbackURL: `${config.server.public}/api/v1/muchbetter`,
        redirectRequired: true,
        languageISO: player.languageId,
        merchantCustomerId: player.id,
        dobYYYYMMDD: player.dateOfBirth.replace(/-/g, ''),
        countryISO: player.countryId,
        lastNameRaw: player.lastName,
      },
    },
  };

  const { data: response } = await axios.request(options);
  logger.debug('muchbetter deposit response:', response);

  return response;
};

const withdrawalRequest = async (player: PlayerWithDetails, amount: Money, id: string, transactionKey: string, transactionReference: string): Promise<any> => {
  const { walletHost, walletPort, authorizationToken, merchantAccountId } = muchbetterConfig;

  const options = {
    method: 'POST',
    url: `https://${walletHost}:${walletPort}/merchant/push`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorizationToken}`,
    },
    data: {
      amount: money.asFloat(amount),
      currency: player.currencyId,
      idType: 'PHONE',
      idValue: id,
      merchantAccountId,
      transactionReference,
      merchantInternalRef: transactionKey,
      optionalParams: {
        brandName: player.brandId,
        callbackURL: `${config.server.public}/api/v1/muchbetter`,
        redirectRequired: false,
        languageISO: player.languageId,
        merchantCustomerId: player.id,
      },
    },
  };
  const { data: response } = await axios.request(options);
  logger.debug('muchbetter withdrawal response:', response);

  return response;
};

module.exports = {
  depositRequest,
  withdrawalRequest,
};
