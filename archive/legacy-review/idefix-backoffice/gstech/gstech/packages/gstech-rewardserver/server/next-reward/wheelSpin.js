/* @flow */
import type { RewardsAndTargetReturnType } from '../../types/EventData';

const getWheelSpinRewardAndTarget = async (
  pg: Knex,
  rewardDefinitionId: Id,
  promotionName: string,
): Promise<RewardsAndTargetReturnType> => {
  const wheelSpinReward = await pg('rewards')
    .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
    .select('rewards.*')
    .where({
      'reward_definitions.id': rewardDefinitionId,
      promotion: promotionName,
      creditType: 'wheelSpin',
      active: true,
    })
    .first();

  if (!wheelSpinReward) {
    throw new Error(`Could not find wheelSpin reward ${promotionName} ${rewardDefinitionId}`);
  }
  return { rewards: [wheelSpinReward], target: 500000 };
};

module.exports = getWheelSpinRewardAndTarget;
