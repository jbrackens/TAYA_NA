// @flow
import type { PlanDraft, Plan, PlanWithStatistics, RuleDraft, Rule, IdAndName, RuleOrPlan } from '../../../../types/repository/plans';

const { DateTime } = require('luxon');

const getPlansWithStatistics = async (knex: Knex): Promise<PlanWithStatistics[]> => {
  const plans = await knex('plans')
    .select('plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt',
      knex.raw('sum(coalesce(rules.count, 0))::INT AS rules'),
      knex.raw('sum(coalesce(deals.count, 0))::INT + sum(coalesce(links.count, 0))::INT + sum(coalesce(players.count, 0))::INT AS "usages"'))
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM rules GROUP BY "planId") as rules'), 'rules.planId', 'plans.id')
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM deals GROUP BY "planId") as deals'), 'deals.planId', 'plans.id')
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM links GROUP BY "planId") as links'), 'links.planId', 'plans.id')
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM players GROUP BY "planId") as players'), 'players.planId', 'plans.id')
    .where({ archived: false })
    .groupByRaw('plans.id, plans.name, plans.nrs, plans.cpa, plans.archived, plans."createdBy", plans."createdAt", plans."updatedAt"')
    .orderBy('plans.id');

  return plans;
};

const getPlanWithStatistics = async (knex: Knex, planId: Id): Promise<?PlanWithStatistics> => {
  const [plan] = await knex('plans')
    .select('plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt',
      knex.raw('sum(coalesce(rules.count, 0))::INT AS rules'),
      knex.raw('sum(coalesce(deals.count, 0))::INT + sum(coalesce(links.count, 0))::INT AS "usages"'))
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM rules GROUP BY "planId") as rules'), 'rules.planId', 'plans.id')
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM deals GROUP BY "planId") as deals'), 'deals.planId', 'plans.id')
    .leftJoin(knex.raw('(SELECT "planId", count(*) AS count FROM links GROUP BY "planId") as links'), 'links.planId', 'plans.id')
    .where({ 'plans.id': planId })
    .groupByRaw('plans.id, plans.name, plans.nrs, plans.cpa, plans.archived, plans."createdBy", plans."createdAt", plans."updatedAt"')
    .orderBy('plans.id');

  return plan;
};

const getPlans = async (knex: Knex): Promise<Plan[]> => {
  const plans = await knex('plans')
    .select('plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt')
    .where({ archived: false })
    .orderBy('plans.id');

  return plans;
};

const getPlan = async (knex: Knex, planId: Id): Promise<?Plan> => {
  const [plan] = await knex('plans')
    .select('plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt')
    .where({ 'plans.id': planId });

  return plan;
};

const getPlanByName = async (knex: Knex, name: string): Promise<?Plan> => {
  const [plan] = await knex('plans')
    .select('plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt')
    .where({ name });

  return plan;
};

const createPlan = async (knex: Knex, planDraft: PlanDraft, userId: Id): Promise<Plan> => {
  const now = DateTime.utc();
  const [plan] = await knex('plans')
    .insert({ ...planDraft, createdBy: userId, createdAt: now, updatedAt: now })
    .returning(['plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt']);

  return plan;
};

const updatePlan = async (knex: Knex, planId: Id, planDraft: PlanDraft): Promise<Plan> => {
  const now = DateTime.utc();
  const [plan] = await knex('plans')
    .update({ ...planDraft, updatedAt: now })
    .where({ id: planId })
    .returning(['plans.id', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.archived', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt']);

  return plan;
};

const deletePlan = async (knex: Knex, planId: Id): Promise<number> => {
  const count = await knex('plans')
    .delete()
    .where({ id: planId });

  return count;
};

const getRules = async (knex: Knex, planId: Id): Promise<Rule[]> => {
  const rules = await knex('rules')
    .select('rules.id', 'rules.planId', 'rules.countryId', knex.raw('rules.nrs::REAL'), 'rules.cpa', 'rules.deposit', 'rules.deposit_cpa')
    .where({ planId })
    .orderBy('rules.id');

  return rules;
};

const getRuleOrPlan = async (knex: Knex, planId: Id, countryId: CountryId): Promise<?RuleOrPlan> => {
  const [ruleOrPlan] = await knex('plans')
    .select('plans.id as planId',
      knex.raw('coalesce("countryRule".id, "defaultRule".id) as "ruleId"'),
      knex.raw('coalesce(coalesce("countryRule".nrs, "defaultRule".nrs), plans.nrs)::REAL as nrs'),
      knex.raw('coalesce(coalesce("countryRule".cpa, "defaultRule".cpa), plans.cpa) as cpa'),
      knex.raw('coalesce("countryRule".deposit, "defaultRule".deposit) as deposit'),
      knex.raw('coalesce("countryRule".deposit_cpa, "defaultRule".deposit_cpa) as deposit_cpa'))
    .leftJoin('rules as countryRule', 'countryRule.planId', knex.raw('plans.id and ("countryRule"."countryId" = ?)', [countryId]))
    .leftJoin('rules as defaultRule', 'defaultRule.planId', knex.raw('plans.id and ("defaultRule"."countryId" IS NULL)'))
    .where({ 'plans.id': planId });

  return ruleOrPlan;
};

const getRelatedAffiliates = async (knex: Knex, planId: Id): Promise<IdAndName[]> => {
  const affiliates = await knex('affiliates')
    .select('affiliates.id', 'affiliates.name', 'affiliates.email')
    .whereRaw(`affiliates.id in (
      SELECT "affiliateId" FROM players WHERE "planId"=?
      UNION ALL
      SELECT "affiliateId" FROM links WHERE "planId"=?
      UNION ALL
      SELECT "affiliateId" FROM deals WHERE "planId"=?)`, [planId, planId, planId])
    .orderBy('affiliates.name')
    .orderBy('affiliates.id');

  return affiliates;
};

const createRule = async (knex: Knex, ruleDraft: RuleDraft, planId: Id): Promise<Rule> => {
  const [rule] = await knex('rules')
    .insert({ planId, ...ruleDraft })
    .returning(['rules.id', 'rules.planId', 'rules.countryId', knex.raw('rules.nrs::REAL'), 'rules.cpa', 'rules.deposit', 'rules.deposit_cpa']);

  return rule;
};

const createRules = async (knex: Knex, ruleDraft: RuleDraft[], planId: Id): Promise<Rule[]> => {
  const rules = await knex('rules')
    .insert(ruleDraft.map(r => ({ planId, ...r })))
    .returning(['rules.id', 'rules.planId', 'rules.countryId', knex.raw('rules.nrs::REAL'), 'rules.cpa', 'rules.deposit', 'rules.deposit_cpa']);

  return rules;
};

const updateRule = async (knex: Knex, ruleId: Id, ruleDraft: RuleDraft): Promise<Rule> => {
  const [rule] = await knex('rules')
    .update(ruleDraft)
    .where({ id: ruleId })
    .returning(['rules.id', 'rules.planId', 'rules.countryId', knex.raw('rules.nrs::REAL'), 'rules.cpa', 'rules.deposit', 'rules.deposit_cpa']);

  return rule;
};

const deleteRule = async (knex: Knex, ruleId: Id): Promise<number> => {
  const count = await knex('rules')
    .delete()
    .where({ id: ruleId });

  return count;
};

const deleteRules = async (knex: Knex, planId: Id): Promise<number> => {
  const count = await knex('rules')
    .delete()
    .where({ planId });

  return count;
};

module.exports = {
  getPlansWithStatistics,
  getPlanWithStatistics,
  getPlans,
  getPlan,
  getPlanByName,
  createPlan,
  updatePlan,
  deletePlan,
  getRules,
  getRuleOrPlan,
  getRelatedAffiliates,
  createRule,
  createRules,
  updateRule,
  deleteRule,
  deleteRules,
};
