/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';
import type {
  CreatePaymentHandleRequest,
  CreatePaymentHandleResponse,
  IReturnLinksItem,
} from "./types";

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');

const backend = require('gstech-core/modules/clients/backend-payment-api');
const config = require('../../../config');

const { paysafe: paysafeConfig } = config.providers.neteller;

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  const { player, client, urls, params } = depositRequest;

  const body = {
    merchantRefNum: depositRequest.deposit.transactionKey,
    transactionType: 'PAYMENT',
    paymentType: 'NETELLER',
    neteller: {
      consumerId: params.accountId,
    },
    amount: depositRequest.deposit.amount,
    currencyCode: player.currencyId,
    customerIp: client.ipAddress,
    billingDetails: {
      street: player.address,
      city: player.city,
      zip: player.postCode,
      country: player.countryId,
    },
    returnLinks: [
      {
        rel: 'default',
        href: urls.ok,
      },
      {
        rel: 'on_completed',
        href: urls.ok,
      },
      {
        rel: 'on_failed',
        href: urls.failure,
      },
    ],
  };

  logger.debug('paysafe deposit request', { depositRequest, body });
  const { data: response } = await axios.post<
    CreatePaymentHandleRequest,
    CreatePaymentHandleResponse,
  >(`${paysafeConfig.endpoint}/paymenthub/v1/paymenthandles`, body, {
    auth: { username: paysafeConfig.clientId, password: paysafeConfig.clientSecret },
  });

  logger.debug('paysafe deposit response', { response });

  const link = response.links.find(l => l.rel === 'redirect_payment');

  if (!link) {
    throw new Error('neteller payment handle creation failed');
  }

  await backend.updateDeposit(player.username, depositRequest.deposit.transactionKey, {
    depositParameters: { paymentHandleToken: response.paymentHandleToken },
    message: 'add paymentHandleToken',
  });

  const result: DepositResponse = {
    requiresFullscreen: true,
    url: link.href,
  };
  return result;
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    const { withdrawal, player, client } = withdrawRequest;

    const body = ({
      merchantRefNum: withdrawal.transactionKey,
      transactionType: 'STANDALONE_CREDIT',
      paymentType: 'NETELLER',
      neteller: {
        consumerId: withdrawal.account,
      },
      amount: withdrawal.amount,
      currencyCode: player.currencyId,
      customerIp: client.ipAddress,
      billingDetails: {
        street: player.address,
        city: player.city,
        zip: player.postCode,
        country: player.countryId,
      },
      returnLinks: ([]: IReturnLinksItem[]),
    });

    logger.debug('paysafe withdraw request', { withdrawRequest, body });
    const { data: response } = await axios.post<
      CreatePaymentHandleRequest,
      CreatePaymentHandleResponse,
    >(`${paysafeConfig.endpoint}/paymenthub/v1/paymenthandles`, body, {
      auth: { username: paysafeConfig.clientId, password: paysafeConfig.clientSecret },
    });
    logger.debug('paysafe withdraw response', { response });

    const result: WithdrawResponse = {
      ok: true,
      message: response.status,
      id: response.id,
      reject: false,
      complete: false,
      parameters: {
        paymentHandleToken: response.paymentHandleToken,
      },
    };

    return result;
  } catch(e) {
    logger.error('paysafe withdraw error:', e);
    return { ok: false, message: e.message, reject: true, complete: false };
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
