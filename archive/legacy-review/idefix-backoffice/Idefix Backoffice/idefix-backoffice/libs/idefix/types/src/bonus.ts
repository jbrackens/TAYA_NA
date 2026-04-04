export interface Bonus {
  id: number;
  name: string;
  description: string;
  brandId: string;
  archived: boolean;
  active: boolean;
  depositBonus: boolean;
  depositCount: number;
  depositCountMatch: boolean;
  wageringRequirementMultiplier: number;
  daysUntilExpiration: number;
  depositMatchPercentage: number;
  creditOnce: boolean;
}

export interface BonusLimit {
  currencyId: string;
  bonusId: number | null;
  minAmount: number | null;
  maxAmount: number | null;
}

export interface CreateBonusValues {
  name: string;
  active: boolean;
  depositBonus: boolean;
  depositCount: number;
  depositCountMatch: boolean;
  wageringRequirementMultiplier: number;
  daysUntilExpiration: number;
  depositMatchPercentage: number;
  creditOnce: boolean;
  limits: BonusLimit[];
}

export interface BonusDraft {
  id: string;
  amount: number;
  expiryDate?: string;
}

export type AvailableBonusLimits = BonusLimit[];

export type UpdateBonusLimitsRequest = Omit<BonusLimit, "bonusId">[];

export type CreateBonusRequest = Omit<
  CreateBonusValues,
  "limits" | "depositCount" | "depositCountMatch" | "depositMatchPercentage"
> & {
  depositCount?: number;
  depositCountMatch?: boolean;
  depositMatchPercentage?: number;
};

export type UpdateBonusRequest = CreateBonusRequest;
