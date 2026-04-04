/* @flow */

export type PlanBase = {
  name: string,
  nrs: ?number,
  cpa: Money,
};

export type PlanDraft = {
  ...PlanBase,
  archived: boolean,
};

export type Plan = {
  id: Id,

  ...PlanDraft,

  createdBy: Id,
  createdAt: Date,
  updatedAt: Date,
};

export type PlanWithStatistics = {
  ...Plan,
  rules: number,
  usages: number,
};

export type RuleDraft = {
  countryId: ?CountryId,
  nrs: number,
  cpa: Money,
  deposit: Money,
  deposit_cpa: Money,
};

export type Rule = {
  id: Id,
  planId: Id,
  ...RuleDraft,
};

export type RuleOrPlan = {
  planId: Id,
  ruleId: ?Id,
  nrs: ?number,
  cpa: Money,
  deposit: ?Money,
  deposit_cpa: ?Money,
};

export type IdAndName = {
  id: Id,
  name: string,
  email: string,
};
