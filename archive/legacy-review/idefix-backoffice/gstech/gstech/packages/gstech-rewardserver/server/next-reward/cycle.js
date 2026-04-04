/* @flow */
import type { RewardsAndTargetReturnType } from '../../types/EventData';

const _ = require('lodash');

const getBountyCycleRewardAndTarget = async (
  knex: Knex,
  rewardDefinitionId: Id,
  brandId: BrandId,
  playerId: Id,
  promotion?: string,
  highrollerRewardType: string,
): Promise<RewardsAndTargetReturnType> => {
  const skipCycleWhere =
    "(cast(metadata ->> 'skipCycle' as boolean) = false or metadata -> 'skipCycle' is null)";

  const previousProgress = await knex('progresses')
    .select('id', 'perRewardDefinitionCount', 'contribution', 'betCount')
    .where({ rewardDefinitionId, playerId })
    .orderBy('perRewardDefinitionCount', 'desc')
    .first();

  let reward;
  if (!previousProgress) {
    reward = await knex('rewards')
      .select('rewards.*')
      .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
      .where({ rewardDefinitionId, active: true, removedAt: null })
      .whereRaw(skipCycleWhere)
      .modify((qb) => (promotion ? qb.where({ promotion }) : qb))
      .orderBy('order', 'asc')
      .first();
  } else {
    const avgBet = previousProgress.contribution / previousProgress.betCount;
    if (avgBet > 250) {
      // Highroller
      const rewards = await knex('rewards')
        .select('rewards.*')
        .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
        .where({ rewardType: highrollerRewardType, brandId, active: true, removedAt: null })
        .whereRaw(skipCycleWhere);
      reward = _.sample(rewards);
    } else {
      const rewards = await knex('rewards')
        .select('rewards.*')
        .leftJoin('reward_definitions', 'reward_definitions.id', 'rewards.rewardDefinitionId')
        .where({ rewardDefinitionId, active: true, removedAt: null })
        .modify((qb) => (promotion ? qb.where({ promotion }) : qb))
        .whereRaw(skipCycleWhere);
      reward = _.sample(rewards);
    }
  }

  if (!reward || !reward.metadata.trigger_phase) {
    throw new Error(`Cannot get proper reward for rewardDefinitionId ${rewardDefinitionId}`);
  }
  return { rewards: [reward], target: 100 * reward.metadata.trigger_phase };
};

module.exports = getBountyCycleRewardAndTarget;
