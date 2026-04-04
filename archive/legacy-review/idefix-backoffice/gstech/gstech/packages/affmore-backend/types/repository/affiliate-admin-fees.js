// @flow
import type { AdminFeeDraft, AdminFeeWithComputedValues } from './admin-fees';

export type AffiliateAdminFeeDraft = {
  affiliateFeeId?: Id,
  affiliateId: Id,
  adminFeeId: Id,
  brandId: BrandId,
  period: Interval,
};

export type AffiliateAdminFee = {
  id: Id,
  ...AffiliateAdminFeeDraft,
  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type AffiliateAdminFeeRule = {
  ruleId: Id,
  countryId: CountryId,
  percent: number,
};

export type AffiliateAdminFeeWithRules = {
  ...AffiliateAdminFee,
  ...AdminFeeWithComputedValues,
  rules: AffiliateAdminFeeRule[],
};

export type AffiliateViewAdminFeeWithRules = {
  ...AdminFeeDraft,
  ...AffiliateAdminFeeDraft,
  isRunning: boolean,
  rules: AffiliateAdminFeeRule[],
};
