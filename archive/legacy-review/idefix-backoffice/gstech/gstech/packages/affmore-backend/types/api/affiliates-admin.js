// @flow
import type { AffiliateProfile } from './affiliates';
import type { AffiliateAdminUpdateDraft } from '../repository/affiliates';
import type { UserWithRoles } from '../repository/auth';

export type AffiliateAdminProfile = {
  ...AffiliateProfile,

  floorBrandCommission: boolean,
  allowNegativeFee: boolean,
  allowPayments: boolean,
  isInternal: boolean,
  isClosed: boolean,
  userId: ?Id,
  masterId: ?Id,
};

export type GetAffiliatesOverviewAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    year: number,
    month: number,
  },
  query: {
    brandId?: BrandId,
    includeInternals?: boolean,
  },
};

export type GetAffiliateAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type UpdateAffiliateAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  affiliate: AffiliateAdminUpdateDraft,
};

export type GetAffiliateOverviewAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    year: number,
    month: number,
  },
};

export type GetSubAffiliatesAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    year: number,
    month: number,
  },
};

export type GetAffiliatesResponse = {
  affiliates: {
    affiliateId: Id,
    affiliateName: string,
    affiliateEmail: string,
  }[],
};

export type GetAffiliateAdminResponse = {
  ...AffiliateAdminProfile,
  accountBalance: Money,
};

export type UpdateAffiliateAdminResponse = {
  ...AffiliateAdminProfile,
  accountBalance: Money,
};
