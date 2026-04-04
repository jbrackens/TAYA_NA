/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type {
  JetonCheckoutRequest,
  JetonCheckoutResponse,
  JetonWalletPayoutRequest,
  JetonWalletPayoutResponse,
  JetonGOPayRequest,
  JetonGOPayResponse,
  JetonGOPayoutRequest,
  JetonGOPayoutResponse,
} from './types';

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const config = require('../../../config');

const configuration = config.providers.jeton;

const jetonCheckout = async (player: PlayerWithDetails, amount: Money, transactionKey: string, urls: URLFork, customer?: string): Promise<JetonCheckoutResponse> => {
  const { apiKey } = configuration.brands[player.brandId];
  const { endpoint } = configuration;

  const options: JetonCheckoutRequest = {
    body: {
      orderId: transactionKey,
      currency: player.currencyId,
      amount: money.formatMoney(amount),
      returnUrl: urls.ok,
      method: 'CHECKOUT',
      customer: customer || null,
      language: player.languageId,
    },
  };

  logger.debug('jeton checkout request:', { options });
  const { data: response } = await axios.post<
    $PropertyType<JetonCheckoutRequest, 'body'>,
    JetonCheckoutResponse,
  >(`${endpoint}/api/v3/integration/merchants/payments/pay`, options.body, {
    headers: { 'X-API-KEY': apiKey },
  });
  logger.debug('jeton checkout response:', response);

  return response;
};

const jetonWalletPayout = async (player: PlayerWithDetails, amount: Money, transactionKey: string, customer: string): Promise<JetonWalletPayoutResponse> => {
  const { apiKey } = configuration.brands[player.brandId];
  const { endpoint } = configuration;

  const options: JetonWalletPayoutRequest = {
    body: {
      orderId: transactionKey,
      amount: money.formatMoney(amount),
      currency: player.currencyId,
      customer,
    },
  };

  logger.debug('jeton wallet payout request:', { options });
  const { data: response } = await axios.post<
    $PropertyType<JetonWalletPayoutRequest, 'body'>,
    JetonWalletPayoutResponse,
  >(`${endpoint}/api/v3/integration/merchants/payments/payout`, options.body, {
    'X-API-KEY': apiKey,
  });
  logger.debug('jeton wallet payout response:', { response });

  return response;
};

const jetonGoPay = async (player: PlayerWithDetails, amount: Money, transactionKey: string, urls: URLFork, customer?: string): Promise<JetonGOPayResponse> => {
  const { apiKey } = configuration.brands[player.brandId];
  const { endpoint } = configuration;

  const options: JetonGOPayRequest = {
    json: true,
    method: 'POST',
    url: `${endpoint}/api/v3/integration/merchants/payments/pay`,
    headers: { 'X-API-KEY': apiKey },
    body: {
      orderId: transactionKey,
      currency: player.currencyId,
      amount: money.formatMoney(amount),
      returnUrl: urls.ok,
      method: 'JETGO',
      customer: customer || null,
      language: player.languageId,
    },
  };

  logger.debug('jeton go pay request:', { options });
  const { data: response } = await axios.post<
    $PropertyType<JetonGOPayRequest, 'body'>,
    JetonGOPayResponse,
  >(`${endpoint}/api/v3/integration/merchants/payments/pay`, options.body, {
    headers: { 'X-API-KEY': apiKey },
  });

  logger.debug('jeton go pay response:', response);

  return response;
};

const jetonGoPayout = async (player: PlayerWithDetails, amount: Money, transactionKey: string, customer: string): Promise<JetonGOPayoutResponse> => {
  const { apiKey } = configuration.brands[player.brandId];
  const { endpoint } = configuration;

  const options: JetonGOPayoutRequest = {
    json: true,
    method: 'POST',
    url: `${endpoint}/api/v3/integration/merchants/payments/payout`,
    headers: { 'X-API-KEY': apiKey },
    body: {
      orderId: transactionKey,
      amount: money.formatMoney(amount),
      currency: player.currencyId,
      customer,
      type: 'JETGO',
      note: '',
    },
  };

  logger.debug('jeton go payout request:', { options });
  const { data: response } = await axios.post<
    $PropertyType<JetonGOPayoutRequest, 'body'>,
    JetonGOPayoutResponse,
  >(`${endpoint}/api/v3/integration/merchants/payments/payout`, options.body, {
    headers: { 'X-API-KEY': apiKey },
  });
  logger.debug('jeton go payout response:', { response });

  return response;
};

module.exports = {
  jetonCheckout,
  jetonWalletPayout,
  jetonGoPay,
  jetonGoPayout,
};
