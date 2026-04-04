/* @flow */
import type {
  RewardDefinition,
} from 'gstech-core/modules/types/rewards';
import type { RewardsAndTargetReturnType } from '../../types/EventData';

const getWheelSpinRewardAndTarget = require('./wheelSpin');
const getMarkkaRewardAndTarget = require('./markka');
const getCycleRewardAndTarget = require('./cycle');
const getCoinRewardAndTarget = require('./coin');

const getNextRewardAndTarget = async (
  pg: Knex,
  { id, rewardType, brandId }: RewardDefinition,
  promotionName?: string,
  playerId: Id,
): Promise<RewardsAndTargetReturnType> => {
  switch (rewardType) {
    case 'wheelSpin':
      return getWheelSpinRewardAndTarget(pg, id, promotionName || '');
    case 'markka':
      return getMarkkaRewardAndTarget(pg, id, playerId);
    case 'bountyCycle':
      return getCycleRewardAndTarget(pg, id, brandId, playerId, promotionName, 'bountyCycleHighrollers');
    case 'rewardCycle':
      return getCycleRewardAndTarget(pg, id, brandId, playerId, promotionName, 'rewardCycleHighrollers');
    case 'iron':
      return getCoinRewardAndTarget(pg, id, brandId, playerId);
    default: {
      throw new Error(`Cannot get next reward for type: ${rewardType}`);
    }
  }
};

module.exports = getNextRewardAndTarget;
