// @flow
import type {
  WithdrawRequest,
  WithdrawResponse,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type { PaymentProviderApi } from '../../types';

const backend = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const ISignThis = require('./isx');

const withdraw = async (withdrawRequest: WithdrawRequest): Promise<WithdrawResponse> => {
  try {
    logger.info('>>> ISX withdraw', { withdrawRequest });
    const { conversionRates } = await backend.getConversionRates();
    const { batchId: id, eurAmount } = await ISignThis.payout(withdrawRequest, conversionRates);
    const withdrawResponse: WithdrawResponse = {
      ok: true,
      message: `ISX withdrawal initiated`,
      reject: false,
      id,
      complete: false,
      parameters: { eurAmount, batchId: id },
      transaction: { eurAmount, batchId: id }
    };
    logger.debug('<<< ISX withdraw', { withdrawResponse });
    return withdrawResponse;
  } catch (e) {
    logger.error('XXX ISX withdraw', { e });
    const withdrawResponse: WithdrawResponse = {
      ok: false,
      message: e.message,
      reject: true,
      complete: false,
    };
    return withdrawResponse;
  }
};

const api: PaymentProviderApi = { withdraw };
module.exports = api;
