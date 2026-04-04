/* @flow */

export type GetAvailableRewardsParams = {|
  'reward-type': RewardType,
|};

export type GetAvailableRewardsResponse = {
  rewards: { // TODO: eventually, this should be Reward type instead when monorepo comes
    rewardId: Id,
    creditType: CreditType,
    bonusCode: string,
    description: string,
    externalId: string,
    metadata?: Object,
    oncePerPlayer: boolean,
  }[],
};

export type GetUnusedLedgersParams = {|
  'player-id': Id,
  'reward-type': RewardType,
|};

export type GetUnusedLedgersResponse = {|
  ledgers: { // TODO: eventually, this should be Reward type instead when monorepo comes
    id: Id,
    rewardId: Id,
    rewardName: string,
  }[],
|};

export type CreditRewardParams = {|
  rewardId: Id,
  playerId: Id,
  externalId?: string,
  count: number,
|};

export type ExchangeRewardParams = {|
  brandId: BrandId,
  rewardId: Id,
  playerId: Id,
|};

export type ExchangeRewardResponse = OkResult;

export type UseLedgerParams = {|
  brandId: BrandId,
  ledgerId: Id,
  playerId: Id,
|};

export type UseLedgerResponse = OkResult;


export type CreditRewardRequest = {
  playerId: Id,
  externalId?: string,
  count?: number,
};

export type CreditRewardResponse = {
  ledgers: { rewardId: Id, id: Id }[],
};

export type GetRewardsResponse = {|
  id: Id,
  externalId: string,
  description: string,
  bonusCode: string
|}[];

export type RewardType =
  | "bounty"
  | "wheelSpin"
  | "coin"
  | "reward"
  | "shopItem";

export type GetPlayersProgressResponse = {|
  progress: {
    rewardType: RewardType,
    ledgers: number,
    progress: number,
    multiplier: number,
    rewards: {| externalId: string, quantity: number |}[],
  }[],
|};
