/* @flow */

export type UseLootBoxResponse = Array<{
  id: Id,
  creditType: string,
  rewardType: string,
  value: number,
  spins?: number,
  spinValue?: number,
  game?: string,
}>;
