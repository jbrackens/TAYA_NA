// @flow
import type { PlanDraft, RuleDraft } from '../repository/plans';
import type { UserWithRoles } from '../repository/auth';

export type AffiliatePlan = {
  planId: Id,
  name: string,
  nrs: ?number,
  isLadder: boolean,
  cpa: Money,
  archived: boolean,
  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type AffiliateRule = {
  ruleId: Id,
  countryId: ?CountryId,
  nrs: number,
  cpa: Money,
  deposit: Money,
  deposit_cpa: Money,
};

export type CreatePlanRequest = {
  session: {
    user: UserWithRoles,
  },
  plan: PlanDraft,
  rules: RuleDraft[],
};

export type GetPlanRequest = {
  params: {
    planId: Id,
  },
};

export type UpdatePlanRequest = {
  params: {
    planId: Id,
  },
  plan: PlanDraft,
  rules: RuleDraft[],
};

export type DeletePlanRequest = {
  params: {
    planId: Id,
  },
};

export type CreatePlanResponse = {
  plan: AffiliatePlan,
  rules: AffiliateRule[],
};

export type GetPlansResponse = {
  plans: {
    ...AffiliatePlan,
    rules: number,
    usages: number,
  }[],
};

export type GetPlanResponse = {
  plan: AffiliatePlan,
  rules: AffiliateRule[],
  affiliates: {
    affiliateId: Id,
    affiliateName: string,
    affiliateEmail: string,
  }[],
};

export type UpdatePlanResponse = {
  plan: AffiliatePlan,
  rules: AffiliateRule[],
};
