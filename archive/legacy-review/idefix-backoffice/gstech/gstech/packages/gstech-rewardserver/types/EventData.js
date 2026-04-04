/* @flow */

import type { Reward } from 'gstech-core/modules/types/rewards';

export type Promotion = {
  name: string,
  contribution: Money,
};

export type Bet = {
  playerId: Id,
  brandId: BrandId,
  permalink: string,
  bet: Money,
  win: Money,
  promotions?: Promotion[],
};

export type RewardsAndTargetReturnType = {
  rewards: Reward[],
  target: number,
  progressModifier?: {
    contribution?: Money,
    multiplier?: number,
  };
};
