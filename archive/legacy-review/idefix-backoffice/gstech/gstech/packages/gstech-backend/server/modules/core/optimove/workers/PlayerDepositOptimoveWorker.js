/* @flow */
import type { Job } from 'gstech-core/modules/queue';
import type { OptimoveTransaction } from '../optimove-types';

const logger = require('gstech-core/modules/logger');
const mappers = require('../optimove-mappers');
const db = require('../optimove-db');

const handleJob = async ({ data }: Job<any>): Promise<?OptimoveTransaction> => {
  logger.debug('optimove PlayerDepositOptimoveWorker', { data });
  const { player, deposit, transactionKey, trace } = data;
  try {
    const customer = mappers.mapOptimoveCustomer(player);
    const transaction = mappers.mapOptimoveDeposit(deposit);
    logger.debug('optimove PlayerDepositOptimoveWorker mapOptimoveDeposit', { transaction });

    return await db.upsertCustomerAndTransaction(customer, transaction);
  } catch (e) {
    logger.error(`optimove ERROC ${player.username}:${trace}:${transactionKey}`, e, deposit);
    return null;
  }
};

module.exports = {
  handleJob,
};
