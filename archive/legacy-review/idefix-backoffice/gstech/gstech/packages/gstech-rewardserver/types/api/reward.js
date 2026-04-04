/* @flow */

import type { Reward } from 'gstech-core/modules/types/rewards';

export type GetBrandRewardsResponse = {
  rewards: Reward[]
};

export type GetLedgersResponse = {
  ledgers: {
    ledgerId: Id,
    rewardName: string,
  }[],
};
