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
  logger.debug('optimove PlayerWinOptimoveWorker', { data });
  const { gameRoundData, rest } = data;
  try {
    const gameRound = mappers.mapOptimoveGameWithGameType(gameRoundData);
    logger.debug('optimove PlayerWinOptimoveWorker mapOptimoveGame', { gameRound });
    return await db.upsertGameAndUpdateCustomerBalance(gameRound, rest.winResult.balance);
  } catch (e) {
    logger.error('optimove PlayerWinOptimoveWorker error', e, gameRoundData);
    return null;
  }
};

module.exports = {
  handleJob,
};
