/* @flow */
import type { PlayerWithRisk } from './player';
import type { Deposit } from './backend';

export type BusConsumerPayload<T> = {
  name: string,
  data: T,
};

export type PlayerUpdateType = 'Default' | 'Registration' | 'Login' | 'Deposit';

export type DepositEvent = {
  player: PlayerWithRisk,
  deposit: Deposit,
  segments: string[],
  updateType: PlayerUpdateType,
};

export type PlayerUpdateEvent = {
  player: PlayerWithRisk,
  segments: string[],
  updateType: PlayerUpdateType,
};

export type WageringEvent = {
  permalink: string,
  playerId: Id,
  brandId: BrandId,
  bet: Money,
  win: Money,
  promotions: {
    name: string,
    value: Money,
    contribution: Money,
  }[],
};

export type RewardProgressUpdateEvent = {
  playerId: Id,
  brandId: BrandId,
  rewardType: string,
  target: Money,
  contribution: Money,
};

export type CreditRewardEvent = {
  playerId: Id,
  brandId: BrandId,
  rewardType: string,
};
