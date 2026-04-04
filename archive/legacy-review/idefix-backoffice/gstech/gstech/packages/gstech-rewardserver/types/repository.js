/* @flow */
import type { Reward, CasinoCurrency } from 'gstech-core/modules/types/rewards';

export type FavouriteGames = Array<{
  gameId: Id,
  avgBet: number,
  betCount: number,
}>;

export type LootBoxLedger = {
  price: number,
  currency: string,
  playerId: Id,
  brandId: BrandId,
};

export type RewardWithPermalink = {
  permalink: string,
  ...Reward,
  cost: number,
  brandId: BrandId,
};

export type ShopItemReward = {
  price: number,
  rewardDefinitionId: Id,
  validity: number,
  currency: CasinoCurrency,
};
