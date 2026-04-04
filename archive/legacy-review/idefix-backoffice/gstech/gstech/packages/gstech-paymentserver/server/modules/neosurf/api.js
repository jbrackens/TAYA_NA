/* @flow */
import type {
  DepositRequest,
  DepositResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const Neosurf = require('./Neosurf');

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  try {
    logger.debug('Neosurf deposit request:', { depositRequest });

    const {
      player,
      urls,
      deposit: { amount, transactionKey },
    } = depositRequest;

    const response = await Neosurf.deposit(player, amount, transactionKey, urls);

    const depositResponse: DepositResponse = {
      html: response,
      requiresFullscreen: true,
    };
    return depositResponse;

  } catch (e) {
    logger.error('Neosurf deposit error:', e);

    const depositResponse: DepositResponse = {
      url: depositRequest.urls.failure,
      requiresFullscreen: false,
    };
    return depositResponse;
  }
};

const api: PaymentProviderApi = { deposit };
module.exports = api;
