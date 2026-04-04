/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const Jeton = require('./Jeton');
const jetonQR = require('./jeton-qr');

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  try {
    logger.debug('Jeton deposit request:', { depositRequest });

    const {
      player,
      urls,
      client,
      deposit: { paymentMethod, account, amount, transactionKey },
    } = depositRequest;

    if (paymentMethod === 'JetonWallet') {
      const response = await Jeton.jetonCheckout(player, amount, transactionKey, urls, account);

      const depositResponse: DepositResponse = {
        url: response.checkout,
        requiresFullscreen: true,
      };
      return depositResponse;
    }

    if (paymentMethod === 'JetonGO') {
      const response = await Jeton.jetonGoPay(player, amount, transactionKey, urls, account);
      if (client.isMobile) {
        const depositResponse: DepositResponse = {
          url: response.appPaymentLink,
          requiresFullscreen: true,
        };
        return depositResponse;
      }
      const depositResponse: DepositResponse = {
        html: jetonQR(urls.ok, urls.failure, response.qr, response.appPaymentLink),
        requiresFullscreen: false,
      };
      return depositResponse;
    }

    throw new Error(`Payment method ${paymentMethod} is not supported`);
  } catch (e) {
    logger.error('Jeton deposit error:', e);

    const depositResponse: DepositResponse = {
      url: depositRequest.urls.failure,
      requiresFullscreen: false,
    };
    return depositResponse;
  }
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    logger.debug('Jeton withdrawal request:', { withdrawRequest });

    const {
      player,
      withdrawal: { paymentMethodName, account, amount, transactionKey },
    } = withdrawRequest;

    if (!account) throw new Error(`Player ${player.id} is missing account`);

    let response;
    switch (paymentMethodName) {
      case 'JetonWallet':
        response = await Jeton.jetonWalletPayout(player, amount, transactionKey, account);
        break;
      case 'JetonGO':
        response = await Jeton.jetonGoPayout(player, amount, transactionKey, account);
        break;
      default:
        throw new Error(`Payment method ${paymentMethodName} is not supported`);
    }

    const withdrawResponse: WithdrawResponse = {
      ok: true,
      message: 'Jeton withdrawal initiated',
      reject: false,
      id: `${response.paymentId}`,
      complete: false,
    };
    return withdrawResponse;
  } catch (e) {
    logger.error('Jeton withdraw error:', e);
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
