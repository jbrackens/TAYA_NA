/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const Luqapay = require('./Luqapay');
const paymentForm = require('./payment-form');

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  try {
    logger.debug('Luqapay deposit request:', { depositRequest });

    const { player, urls, deposit: { transactionKey, amount } } = depositRequest;

    const banks = await Luqapay.getDepositData(player, amount);

    const html = paymentForm.create(banks, transactionKey, urls, player.currencyId);

    const depositResponse: DepositResponse = {
      html,
      requiresFullscreen: false,
    };
    return depositResponse;

  } catch (e) {
    logger.error('Luqapay deposit error:', e);

    const depositResponse: DepositResponse = {
      url: depositRequest.urls.failure,
      requiresFullscreen: false,
    };
    return depositResponse;
  }
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {  
  try {
    logger.debug('Luqapay withdrawal request:', { withdrawRequest });

    const {
      player,
      withdrawal: { account, accountParameters, amount, transactionKey },
    } = withdrawRequest;

    if (!accountParameters?.swiftCode) {
      const withdrawResponse: WithdrawResponse = {
        ok: false,
        message: 'Missing swiftCode in accountParameters',
        reject: false,
        complete: false,
      };

      return withdrawResponse;
    }

    const withdrawalResponse = await Luqapay.initializeWithdrawal(player, amount, transactionKey, account, accountParameters.swiftCode);

    if (withdrawalResponse.status === 'ERROR') {
      const withdrawResponse: WithdrawResponse = {
        ok: false,
        message: withdrawalResponse.message,
        reject: true,
        id: withdrawalResponse.transactionId,
        complete: false,
      };
      return withdrawResponse;
    }

    const withdrawResponse: WithdrawResponse = {
      ok: true,
      message: 'Luqapay withdrawal initiated',
      reject: false,
      id: withdrawalResponse.transactionId,
      complete: false,
    };
    return withdrawResponse;
  } catch (e) {
    logger.error('Luqapay withdraw error:', e);
    const withdrawResponse: WithdrawResponse = {
      ok: false,
      message: e.message,
      reject: true,
      complete: false,
    };
    return withdrawResponse;
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
