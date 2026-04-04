/* @flow */
export type AdminFeeDraft = {
  name: string,
  percent: number,
  active: boolean,
};

export type AdminFeeComputedFields = {
  isRunning: boolean,
  nextMonthActive?: boolean,
  nextMonthPercent?: number,
  draftRemovedAt?: string,
};

export type AdminFee = {
  id: Id,
  ...AdminFeeDraft,
  createdAt: Date,
  updatedAt: Date,
};

export type AdminFeeWithComputedValues = {
  ...AdminFee,
  ...AdminFeeComputedFields,
};

export type AdminFeeRuleDraft = {
  countryId: CountryId,
  percent: number,
  adminFeeId?: Id,
};

export type AdminFeeRule = {
  id: Id,
  adminFeeId: Id,
  draftId: Id,
  ...AdminFeeRuleDraft,
  createdAt: Date,
  updatedAt: Date,
  removedAt: Date,
};

export type AdminFeeWithRules = {
  ...AdminFee,
  rules: AdminFeeRule[],
};

type AdminFeeAffiliateBrandInfo = {
  brandId: BrandId,
  periodFrom: string,
  periodTo: string,
};

export type AdminFeeAffiliateInfo = {
  affiliateId: Id,
  affiliateName: string,
  affiliateEmail: string,
  brands: AdminFeeAffiliateBrandInfo[],
};

export type AdminFeeWithAffiliates = {
  ...AdminFeeWithComputedValues,
  rules: AdminFeeRule[],
  affiliates: AdminFeeAffiliateInfo[],
};
