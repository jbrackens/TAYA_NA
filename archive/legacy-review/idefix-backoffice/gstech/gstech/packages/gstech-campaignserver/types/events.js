/* @flow */

export type RewardToCredit = {
  rewardRulesId: Id,
  campaignId: Id,
  campaignName: string,
  playerId: Id,
  rewardId: Id,
  creditMultiple: boolean,
  minDeposit: Money,
  maxDeposit: Money,
  wager: number,
  quantity: number,
  useOnCredit: boolean,
}
