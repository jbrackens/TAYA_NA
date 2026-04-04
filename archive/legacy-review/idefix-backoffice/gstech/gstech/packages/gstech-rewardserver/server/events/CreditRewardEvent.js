/* @flow */
import type {
  RewardDefinition,
} from 'gstech-core/modules/types/rewards';

import type { CreditRewardEvent } from 'gstech-core/modules/types/bus';

const producers = require('../producer');

const creditReward = async (playerId: Id, brandId: BrandId, rewardDefinition: RewardDefinition) => {
  const { rewardType } = rewardDefinition;

  const event: CreditRewardEvent = {
    playerId,
    brandId,
    rewardType,
  };

  const producer = await producers.lazyRewardCreditedEventProducer();
  await producer(event);
};

module.exports = {
  creditReward,
};
