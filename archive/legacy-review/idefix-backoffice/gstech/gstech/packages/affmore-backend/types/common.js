/* @flow */
import type { UserWithRoles } from "./repository/auth";

export type UserRole = 'user' | 'admin' | 'payer';

export type BannerTag = {
  a: string,
  b: string,
  c: string,
};

export type UserSession = {
  user: UserWithRoles,
};

export type AffiliateSession = {
  affiliateId: Id,
};

export type ActivityData = {
  deposits: Money,
  turnover: Money,
  grossRevenue: Money,
  bonuses: Money,
  adjustments: Money,
  fees: Money,
  tax: Money,
  netRevenue: Money,
  commission: Money,
  cpa: Money,
};
