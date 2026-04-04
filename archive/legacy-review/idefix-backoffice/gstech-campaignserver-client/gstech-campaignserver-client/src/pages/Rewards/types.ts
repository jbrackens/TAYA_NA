import { CreditType, Reward, RewardConfigFieldType } from "app/types";

export interface IRewardFormValues {
  creditType: CreditType;
  bonusCode: string;
  externalId: string;
  description: string;
  price?: number | null;
  cost: string | number | null;
  spins?: number | null;
  spinValue?: number | null;
  spinType?: string | null;
  gameId: number | null;
  currency?: string | null;
  order?: number;
  metadata?: { [key: string]: string | boolean } | null;
}
export interface RewardFormFieldInfo {
  title: string;
  property: string;
  type: RewardConfigFieldType;
  options?: string[];
  preview?: string;
}
export interface RewardFormFieldsInfo {
  externalId: RewardFormFieldInfo;
  creditType: RewardFormFieldInfo;
  game: RewardFormFieldInfo;
  bonusCode: RewardFormFieldInfo;
  description: RewardFormFieldInfo;
  active: RewardFormFieldInfo;
  cost: RewardFormFieldInfo;
  spins?: RewardFormFieldInfo;
  spinType?: RewardFormFieldInfo;
  spinValue?: RewardFormFieldInfo;
  price?: RewardFormFieldInfo;
  currency?: RewardFormFieldInfo;
  [key: string]: RewardFormFieldInfo | undefined;
}

export interface RewardWithOrder extends Reward {
  permalink: string;
  manufacturer: string;
}

export interface RewardFormGamesSelectOption {
  value: number;
  label: string;
  permalink: string;
  manufacturer: string | null | undefined;
}
