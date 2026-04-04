/* @flow */
import type {
  RewardDefinitionDraft,
} from 'gstech-core/modules/types/rewards';

const pg = require('gstech-core/modules/pg');

const { createRewardDefinition, getRewardDefinition } = require('./RewardDefinitions');

describe('RewardDefinitions', () => {
  const rewardDefinitionDraft: RewardDefinitionDraft = {
    rewardType: 'bounty',
    brandId: 'CJ',
    promotion: 'promo',
    internal: false,
    followUpdates: true,
    order: 5,
  };

  describe('createRewardDefinition', () => {
    it('can create entry', async () => {
      const rewardDefinition = await createRewardDefinition(pg, rewardDefinitionDraft);

      expect(rewardDefinition).to.deep.equal({
        id: rewardDefinition.id,
        ...rewardDefinitionDraft,
      });
    });

    it('updates on data duplication', async () => {
      const rewardDefinition = await createRewardDefinition(pg, rewardDefinitionDraft);

      expect(rewardDefinition).to.deep.equal({
        id: rewardDefinition.id,
        ...rewardDefinitionDraft,
      });
    });
  });

  describe('getRewardDefinition', () => {
    it('can get', async () => {
      const { brandId, rewardType } = rewardDefinitionDraft;
      const rewardDefinition = await getRewardDefinition(pg, brandId, rewardType);

      expect(rewardDefinition).to.deep.equal({ id: rewardDefinition.id, ...rewardDefinitionDraft });
    });
  });
});
