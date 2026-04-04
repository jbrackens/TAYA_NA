// @flow
import type { PlanBase } from './plans';

export type DealDraft = {
  affiliateId: Id,
  planId: Id,
  brandId: BrandId,
};

export type Deal = {
  id: Id,

  ...DealDraft,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type DealWithDetails = {
  ...Deal,
  ...PlanBase,
};
