/* @flow */
import type {
  GameWithThumbnailData,
  ProgressWithDetails,
  RewardWithGame,
  LedgerWithRewardAndGame,
  LedgerSource,
} from '../types/rewards';

export type GetAllPlayerLedgersResponse = { ledgers: LedgerWithRewardAndGame[], };

export type GetAvailableRewardsParams = {
  group?: string,
  rewardType?: string,
  externalId?: string,
  excludeDisabled?: boolean,
};

export type GetAvailableRewardsResponse = RewardWithGame[];

export type GetUnusedLedgersParams = {
  group?: string,
  playerId: Id,
  rewardType?: string,
};

export type GetUnusedLedgersResponse = {
  ledgers: LedgerWithRewardAndGame[],
};

export type CreditRewardParams = {
  brandId: BrandId,
  rewardId: Id,
  playerId: Id,
  source: LedgerSource,
  externalLedgerId?: string,
  count: number,
  comment?: string,
  useOnCredit?: boolean,
};

type CreditRewardCore = {
  playerId: Id,
  source?: LedgerSource,
  externalLedgerId?: string,
  count?: number,
  comment?: string,
  userId?: number,
  useOnCredit?: boolean,
};
export type CreditRewardRequest = CreditRewardCore;

export type CreditRewardByExternalIdRequest = {
  externalId: string,
  rewardType?: string,
  group?: string,
  ...CreditRewardCore,
};

export type ExchangeRewardParams = {
  brandId: BrandId,
  rewardId: Id,
  playerId: Id,
};

export type ExchangeRewardResponse = LedgerWithRewardAndGame[];

export type UseLedgerParams = {
  brandId: BrandId,
  ledgerId: Id,
  playerId: Id,
};

export type UseLedgerResponse = RewardWithGame[];

export type CreditRewardResponse = {
  ledgers: { rewardId: Id, id: Id }[],
};

export type PlayerProgress = { ledgers: number, groupId: ?string, ...ProgressWithDetails };

export type GetPlayerProgressesResponse = {
  progresses: PlayerProgress[],
};

export type GetPlayerGamesResponse = GameWithThumbnailData[];
