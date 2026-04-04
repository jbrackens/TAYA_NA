/* @flow */
import type {
  RewardDefinitionDraft,
  RewardDefinition,
} from 'gstech-core/modules/types/rewards';

const { upsert2 } = require('gstech-core/modules/knex');

const createRewardDefinition = async (knex: Knex, rewardDefinitionDraft: RewardDefinitionDraft): Promise<RewardDefinition> => {
  const reward = await upsert2(knex, 'reward_definitions', rewardDefinitionDraft, ['rewardType', 'brandId']);

  return reward;
};

const getRewardDefinition = async (knex: Knex, brandId: BrandId, rewardType: string): Promise<RewardDefinition> => {
  const reward = await knex('reward_definitions')
    .first('*')
    .where({ brandId, rewardType });

  return reward;
};


module.exports = {
  createRewardDefinition,
  getRewardDefinition,
};
