/* @flow */
import type { PlayerWithDetails } from './player';
import type { Deposit } from './backend';

export type BusConsumerPayload<T> = {
  name: string,
  data: T,
};

export type DepositEvent = {|
  player: PlayerWithDetails,
  deposit: Deposit,
|};

export type PlayerUpdateEvent = {|
  player: PlayerWithDetails,
  segments: string[],
|};

export type WageringEvent = {|
  permalink: string,
  playerId: Id,
  brandId: BrandId,
  bet: Money,
  win: Money,
  promotions: {|
    name: string,
    value: Money,
    contribution: Money,
  |}[],
|};

export type RewardProgressUpdateEvent = {|
  playerId: Id,
  brandId: BrandId,
  rewardType: RewardType,
  target: Money,
  contribution: Money,
|};

export type CreditRewardEvent = {|
  playerId: Id,
  brandId: BrandId,
  rewardType: RewardType,
|};
