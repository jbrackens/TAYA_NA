/* @flow */
import type {
  Progress,
  RewardDefinition,
} from 'gstech-core/modules/types/rewards';

import type { RewardProgressUpdateEvent } from 'gstech-core/modules/types/bus';

const producers = require('../producer');

const updateProgress = async (playerId: Id, brandId: BrandId, rewardDefinition: RewardDefinition, progress: Progress) => {
  const { rewardType } = rewardDefinition;
  const { target, contribution } = progress;

  const event: RewardProgressUpdateEvent = {
    playerId,
    brandId,
    rewardType,
    target,
    contribution,
  };

  const producer = await producers.lazyRewardProgressUpdateEventProducer();
  await producer(event);
};

module.exports = {
  updateProgress,
};
