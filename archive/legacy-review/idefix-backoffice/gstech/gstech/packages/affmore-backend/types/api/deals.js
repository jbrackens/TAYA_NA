// @flow
import type { DealDraft } from '../repository/deals';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateDeal = {
  planId: Id,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,

  brandId: BrandId,
  name: string,
  nrs: ?number,
  isLadder: boolean,
  cpa: Money,

  rules: {
    ruleId: Id,
    countryId: ?CountryId,
    nrs: number,
    cpa: Money,
    deposit: Money,
    deposit_cpa: Money,
  }[],
};

export type GetAffiliateDealsAdminRequest = {
  params: {
    affiliateId: Id,
  },
};

export type UpsertAffiliateDealRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  deal: DealDraft,
};

export type DeleteAffiliateDealRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    brandId: BrandId,
  },
};

export type GetAffiliateDealsResponse = {
  deals: AffiliateDeal[],
};

export type UpsertAffiliateDealResponse = {
  deal: AffiliateDeal,
};

export type DeleteAffiliateDealResponse = OkResult;
