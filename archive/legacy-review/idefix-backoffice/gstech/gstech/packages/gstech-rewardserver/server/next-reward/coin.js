/* @flow */
import type { RewardsAndTargetReturnType } from '../../types/EventData';

const cycle = require('./coinCycle.json');

const getCoinRewardAndTarget = async (
  pg: Knex,
  rewardDefinitionId: Id,
  brandId: BrandId,
  playerId: Id,
): Promise<RewardsAndTargetReturnType> => {
  const previousProgress = await pg('progresses')
    .select('id', 'perRewardDefinitionCount')
    .where({ rewardDefinitionId, playerId })
    .orderBy('perRewardDefinitionCount', 'desc')
    .first();

  const index = previousProgress ? previousProgress.perRewardDefinitionCount % cycle.length : 0;
  const step = cycle[index];
  if (!step) {
    throw new Error(`Cannot identify cycle step ${index}`);
  }

  const reward = await pg('rewards')
    .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
    .select('rewards.*')
    .where({ rewardType: step.type, brandId })
    .first();
  if (!reward) {
    throw new Error(`Cannot find a reward of type ${step.type} for brand ${brandId}`);
  }

  const rewards = new Array<any>(step.coins).fill(reward);

  return { rewards, target: step.trigger_phase * 100 };
};

module.exports = getCoinRewardAndTarget;
