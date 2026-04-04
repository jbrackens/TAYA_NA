/* @flow */
import type { Job } from 'gstech-core/modules/queue';
import type { OptimoveTransaction } from '../optimove-types';

const logger = require('gstech-core/modules/logger');
const mappers = require('../optimove-mappers');
const db = require('../optimove-db');

const handleJob = async ({ data }: Job<any>): Promise<?OptimoveTransaction> => {
  try {
    logger.debug('optimove PlayerWithdrawalOptimoveWorker', { data });
    const { withdrawal } = data;

    const transaction = mappers.mapOptimoveWithdrawal(withdrawal);
    logger.debug('optimove PlayerWithdrawalOptimoveWorker mapOptimoveWithdrawal', { transaction });
    return await db.upsertTransactionSafe(transaction);
  } catch (e) {
    logger.error('optimove PlayerWithdrawalOptimoveWorker error', e);
    return null;
  }
};

module.exports = {
  handleJob,
};
