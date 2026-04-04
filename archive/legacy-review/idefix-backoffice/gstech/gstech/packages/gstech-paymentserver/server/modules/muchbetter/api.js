/* @flow */
import type {
  DepositRequest,
  DepositResponse,
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const MuchBetter = require('./MuchBetter');
const muchbetterProgressPage = require('./muchbetter-progress');

const muchbetterConfig = config.providers.muchbetter;

const localizations = {
  en: 'Please confirm you wish to receive payouts',
  fi: 'Hyväksy nostojen vastaanotto',
  no: 'Vennligst bekreft at du ønsker å motta utbetalinger',
  de: 'Bitte bestätige, dass Du Auszahlungen erhalten möchtest',
  sv: 'Vänligen bekräfta att du vill ta emot utbetalningar',
};

const deposit = async (depositRequest: DepositRequest): Promise<DepositResponse> => {
  try {
    const transactionReference = `${depositRequest.brand.name} Deposit: ${depositRequest.deposit.paymentId}`;
    await MuchBetter.depositRequest(depositRequest.player, depositRequest.player.mobilePhone, depositRequest.deposit.amount, depositRequest.deposit.transactionKey, transactionReference);

    const depositResponse: DepositResponse = {
      html: muchbetterProgressPage(depositRequest.urls.ok, depositRequest.urls.failure, `+${depositRequest.player.mobilePhone}`, muchbetterConfig.signupLink, depositRequest.player.languageId),
      requiresFullscreen: false,
    };
    return depositResponse;
  } catch (e) {
    logger.debug('muchbetter deposit error:', e);

    const depositResponse: DepositResponse = {
      url: depositRequest.urls.failure,
      requiresFullscreen: false,
    };
    return depositResponse;
  }
};

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    if (withdrawRequest.withdrawal.accountParameters && withdrawRequest.withdrawal.accountParameters.id) {
      const transactionReference = `${withdrawRequest.brand.name} Withdrawal: ${withdrawRequest.withdrawal.paymentId}`;
      const response = await MuchBetter.withdrawalRequest(
        withdrawRequest.player,
        withdrawRequest.withdrawal.amount,
        withdrawRequest.withdrawal.account,
        withdrawRequest.withdrawal.transactionKey,
        transactionReference,
      );

      const { status, transactionId } = response;

      logger.debug('muchbetter withdraw response:', response);

      const complete = status === 'COMPLETED' || status === 'PENDING';
      const reject = status === 'REJECTED';

      const withdrawResponse: WithdrawResponse = { ok: true, message: status, reject, id: transactionId, complete };
      return withdrawResponse;
    }

    // withdrawal with no previous deposit
    // $FlowFixMe[invalid-computed-prop]
    const transactionReference = localizations[withdrawRequest.player.languageId] || localizations.en;
    const transactionKey = `wd-auth:${withdrawRequest.withdrawal.transactionKey}`;
    const transaction = await MuchBetter.depositRequest(withdrawRequest.player, withdrawRequest.withdrawal.account, 0, transactionKey, transactionReference);

    const withdrawResponse: WithdrawResponse = { ok: true, message: 'Withdrawal is waiting player verification', reject: false, complete: false, transaction };
    return withdrawResponse;
  } catch (e) {
    if (e.errorNumber === 'MBW_905') {
      const withdrawResponse: WithdrawResponse = { ok: true, message: 'Withdrawal is already processed', reject: false, complete: false };
      return withdrawResponse;
    }
    logger.error('muchbetter withdraw error:', e);
    const withdrawResponse: WithdrawResponse = { ok: false, message: e.message, reject: true, complete: false };
    return withdrawResponse;
  }
};

const api: PaymentProviderApi = { deposit, withdraw };
module.exports = api;
