/* @flow */
import type { Job } from 'gstech-core/modules/queue';
import type { OptimoveGameType, OptimoveGame, OptimoveCustomer } from '../optimove-types';
import type { GameRoundForOptimove } from '../repository';

const logger = require('gstech-core/modules/logger');
const mappers = require('../optimove-mappers');
const db = require('../optimove-db');

const handleJob = async ({
  data,
}: Job<{
  gameRoundData: GameRoundForOptimove,
  rest: any,
}>): Promise<?[OptimoveGameType, OptimoveGame, OptimoveCustomer]> => {
  logger.debug('optimove PlayerBetOptimoveWorker', { data });
  const { gameRoundData, rest } = data;
  try {
    const gameRound = mappers.mapOptimoveGameWithGameType(gameRoundData);
    logger.debug('optimove PlayerBetOptimoveWorker mapOptimoveGame', { gameRound });
    return await db.upsertGameAndUpdateCustomerBalance(gameRound, rest.betResult.balance);
  } catch (e) {
    logger.error('optimove PlayerBetOptimoveWorker error', e, gameRoundData);
    return null;
  }
};

module.exports = {
  handleJob,
};
