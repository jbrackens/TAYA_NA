/* @flow */
import type { Job } from 'gstech-core/modules/queue';
import type { OptimoveCustomer } from '../optimove-types';

const logger = require('gstech-core/modules/logger');
const mappers = require('../optimove-mappers');
const db = require('../optimove-db');

const handleJob = async ({ data }: Job<any>): Promise<?OptimoveCustomer> => {
  try {
    logger.debug('optimove PlayerUpdateOptimoveWorker', { data });
    const customer = mappers.mapOptimoveCustomer(data.player);

    logger.debug('optimove PlayerUpdateOptimoveWorker mapOptimoveCustomer', { customer });
    return await db.upsertCustomer(customer);
  } catch (e) {
    logger.error('optimove PlayerUpdateOptimoveWorker error', e);
    return null;
  }
};

module.exports = {
  handleJob,
};
