/* @flow */
import type { UserWithRoles } from '../repository/auth';

export type CreateSubAffiliateRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    subAffiliateId: Id,
  },
  commissionShare: number,
};

export type UpdateSubAffiliateRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    subAffiliateId: Id,
  },
  commissionShare: number,
};

export type DeleteSubAffiliateRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
    subAffiliateId: Id,
  },
};

export type CreateSubAffiliateResponse = OkResult;
export type UpdateSubAffiliateResponse = OkResult;
export type DeleteSubAffiliateResponse = OkResult;
