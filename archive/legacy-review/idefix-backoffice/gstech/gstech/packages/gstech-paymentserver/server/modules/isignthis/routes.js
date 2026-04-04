// @flow
import type { WithdrawalStatusResponse } from 'gstech-core/modules/clients/backend-payment-api';
import type { TransactionState } from './types';

const logger = require('gstech-core/modules/logger');
const backend = require('gstech-core/modules/clients/backend-payment-api');
const isx = require('./isx');

const processWithdrawal = async (
  batchId: string,
  referenceId: string,
  txStatus: TransactionState,
): Promise<?WithdrawalStatusResponse> => {
  if (txStatus === 'PENDING') {
    logger.info(`++++ ISX::processWithdrawal SKIPPING: still 'pending' on ISX`, {
      batchId,
      referenceId,
      state: txStatus,
    });
    return null;
  }
  const {
    withdrawal: { username, transactionKey, status },
  } = await backend.getWithdrawalDetails(referenceId);
  if (status !== 'processing') {
    logger.info(`++++ ISX::processWithdrawal SKIPPING: not in 'processing' state`, {
      batchId,
      referenceId,
      state: txStatus,
      status,
    });
    return null;
  }
  if (txStatus === 'FAILED' && status === 'processing')
    return await backend.setWithdrawalStatus(username, transactionKey, 'failed', {
      externalTransactionId: batchId,
      message: `Withdrawal Failed`,
      rawTransaction: { batchId, referenceId, state: txStatus },
    });
  if (txStatus === 'SUCCEEDED' && status === 'processing')
    return await backend.setWithdrawalStatus(username, transactionKey, 'complete', {
      externalTransactionId: batchId,
      message: `Withdrawal Successful`,
      rawTransaction: { batchId, referenceId, state: txStatus },
    });

  logger.error(`XXXX ISX::processWithdrawal`, {
    wd: { username, transactionKey, status },
    isx: { batchId, referenceId, state: txStatus },
  });
  throw new Error(`XXX ISX::processWithdrawal ISX->'${txStatus}' WD->'${status}'`);
};

const handleManualBatchCancellation = async (
  batchId: string,
): Promise<WithdrawalStatusResponse[]> => {
  const resps: WithdrawalStatusResponse[] = [];
  const batchedPaymentDetails = await backend.queryForPayments({
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    psp: {
      provider: 'ISX',
      method: 'ISX',
    },
    paymentType: 'withdraw',
    paymentStatus: 'processing',
    parameters: { batchId },
  });
  for (const { id, transactionKey } of batchedPaymentDetails) {
    const {
      withdrawal: { username, status },
    } = await backend.getWithdrawalDetails(transactionKey);
    if (status === 'processing') {
      const resp = await backend.setWithdrawalStatus(username, transactionKey, 'failed', {
        externalTransactionId: batchId,
        message: `Batch Cancelled Manually`,
        rawTransaction: { batchId, referenceId: id, state: 'MANUAL BATCH CANCELLATION' },
      });
      resps.push(resp);
    }
  }
  return resps;
};

const processHandler = async (
  { body }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  const results = [];
  const errors = [];
  logger.debug(`>>> ISX::processHandler`, { body });
  const { batchId } = body;
  try {
    const { batchDetails } = await isx.batchDetails(batchId);
    for (const { referenceId, status } of batchDetails)
      try {
        results.push(await processWithdrawal(batchId, referenceId, status));
      } catch (error) {
        errors.push({ error, batchId, referenceId, status });
      }
    logger.debug(`<<< ISX::processHandler`, { results });
    return res.status(200);
  } catch (e) {
    if (e.statusCode === 400 && e.error.error_id === 'ERR400D') {
      try {
        const cancelled = await handleManualBatchCancellation(batchId);
        logger.info(`<<< ISX::processHandler::handleManualBatchCancellation`, { cancelled });
        return res.status(200);
      } catch (err) {
        logger.error(`XXX ISX::processHandler::handleManualBatchCancellation`, { err });
        return res.status(500).json({ error: { message: err.message } });
      }
    }
    logger.error(`XXX ISX::processHandler`, { e, errors });
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = { processHandler };
