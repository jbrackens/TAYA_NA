// @flow
import type { WithdrawRequest } from 'gstech-core/modules/clients/paymentserver-api-types';
import type { ConversionRate } from 'gstech-core/modules/types/backend';
import type {
  BatchDetailsResponse,
  BatchStatusResponse,
  PayoutRequest,
  PayoutResponse,
} from './types';

const logger = require('gstech-core/modules/logger');
const { brandDefinitions } = require('gstech-core/modules/constants');
const clean = require('../piqcashier/clean');
const { isxRequest, formatUsername } = require('./utils');
const config = require('../../../config');

const isxConfig = config.providers.isignthis;

const payout = async (
  {
    withdrawal: { amount, transactionKey, account },
    player: { username, firstName, lastName, currencyId, brandId },
  }: WithdrawRequest,
  rates: ConversionRate[],
): Promise<{ ...PayoutResponse, eurAmount: number }> => {
  try {
    const { merchantId, senderIban } = isxConfig;
    let eurAmount = amount;
    if (currencyId !== 'EUR') {
      const rate = rates.find((r) => r.currencyId === currencyId);
      if (!rate) throw new Error(`No conversion rate for ${currencyId}`);
      eurAmount = Math.round(amount / rate.conversionRate);
    }
    if (!account) throw new Error(`No ISX account for ${username}`);
    const payoutRequest = {
      merchantId,
      senderIban,
      description: formatUsername(username),
      callbackUrl: `${config.server.public}/api/v1/isx?version=1`,
      batchRecords: [
        {
          beneficiaryName: clean(`${firstName} ${lastName}`),
          beneficiaryIban: account,
          beneficiaryReference: `${brandDefinitions[brandId].name}`,
          paymentAmount: `${eurAmount}`,
          currency: 'EUR',
          referenceId: transactionKey,
          paymentDetails: formatUsername(username),
        },
      ],
    };
    logger.debug('>>>> ISX::payout', { payoutRequest });
    const { batchId } = await isxRequest<PayoutRequest, PayoutResponse>(
      'POST',
      'api/v1/batch',
      payoutRequest,
    );
    const resp = { batchId, eurAmount };
    logger.debug('<<<< ISX::payout', { resp });
    return resp;
  } catch (e) {
    logger.warn('!!!! ISX::payout', { e });
    throw e;
  }
};

const batchStatus = async (batchId: string): Promise<BatchStatusResponse> => {
  try {
    logger.debug('>>>> ISX::batchStatus', { batchId });
    const resp = await isxRequest<null, BatchStatusResponse>('GET', `api/v1/batch/${batchId}`);
    logger.debug('<<<< ISX::batchStatus', { resp });
    return resp;
  } catch (e) {
    logger.warn('!!!! ISX::batchStatus', { e });
    throw e;
  }
};

const batchDetails = async (batchId: string): Promise<BatchDetailsResponse> => {
  try {
    logger.debug('>>>> ISX::batchDetails', { batchId });
    const resp = await isxRequest<null, BatchDetailsResponse>(
      'GET',
      `api/v1/batchdetails/${batchId}`,
    );
    logger.debug('<<<< ISX::batchDetails', { resp });
    return resp;
  } catch (e) {
    logger.warn('!!!! ISX::batchDetails', { e });
    throw e;
  }
};

module.exports = { payout, batchStatus, batchDetails };
