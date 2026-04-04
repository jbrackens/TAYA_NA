/* @flow */
import type { UserWithRoles } from '../repository/auth';

export type GetChildrenAffiliatesAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
};

export type GetChildrenAffiliatesRequest = {
  session: {
    affiliateId: Id,
  },
};

export type GetChildrenAffiliatesResponse = {
  affiliates: {
    affiliateId: Id,
    affiliateName: string,
    affiliateEmail: string,
  }[],
};

export type CreateChildAffiliateAdminRequest = {
  session: {
    user: UserWithRoles,
  },
  params: {
    affiliateId: Id,
  },
  affiliate: {
    email: string,
    name: string,
    info: ?string,
  },
};

export type CreateChildAffiliateRequest = {
  session: {
    user: UserWithRoles,
  },
  session: {
    affiliateId: Id,
  },
  affiliate: {
    email: string,
    name: string,
    info: ?string,
  },
};

export type CreateChildAffiliateResponse = OkResult;