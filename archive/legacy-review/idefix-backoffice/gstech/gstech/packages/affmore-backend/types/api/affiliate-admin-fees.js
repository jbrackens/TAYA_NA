// @flow
import type { UserSession } from "../common";
import type {
  AffiliateAdminFeeWithRules,
  AffiliateViewAdminFeeWithRules,
} from '../repository/affiliate-admin-fees';

export type GetAffiliateAdminFeesRequest = {
  params: {
    affiliateId: Id,
  },
};

export type GetAffiliateViewAdminFeesResponse = {
  fees: AffiliateViewAdminFeeWithRules[],
};

export type GetAffiliateAdminFeesResponse = {
  fees: AffiliateAdminFeeWithRules[],
};

export type AffiliateAdminFeeRequest = {
  affiliateFeeId?: Id,
  affiliateId: Id,
  adminFeeId: Id,
  brandId: BrandId,
  periodFrom: Date,
  periodTo: Date,
};

export type UpdateAffiliateAdminFeesRequest = {
  session: UserSession,
  params: {
    affiliateId: Id,
  },
  brandId: BrandId,
  fees: AffiliateAdminFeeRequest[],
};

export type UpdateAffiliateAdminFeeResponse = {
  fees: AffiliateAdminFeeWithRules[],
};
