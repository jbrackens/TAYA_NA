// @flow
import type {
  AdminFeeDraft,
  AdminFeeRuleDraft,
  AdminFee,
  AdminFeeRule,
  AdminFeeWithComputedValues,
  AdminFeeWithAffiliates,
} from '../../../../types/repository/admin-fees';

const _ = require('lodash');
const { DateTime } = require('luxon');

const getAdminFeeRules = async (knex: Knex, adminFeeId: Id): Promise<AdminFeeRule[]> =>
  knex('admin_fee_rules').select(['id', 'countryId', 'percent']).where({ adminFeeId });

const getAdminFee = async (
  knex: Knex,
  adminFeeId: Id,
  inclRemoved: boolean = false,
): Promise<?AdminFee> =>
  knex('admin_fees')
    .first('*')
    .where({ id: adminFeeId })
    .modify((qb) => (!inclRemoved ? qb.where({ removedAt: null }) : qb));

const isAdminFeeDeleted = async (knex: Knex, adminFeeId: Id): Promise<boolean> =>
  knex({ af: 'admin_fees' })
    .leftJoin(
      knex.raw(
        `LATERAL (${knex({ af2: 'admin_fees' })
          .first(['removedAt'])
          .where('af2.draftId', knex.raw('af.id'))
          .toString()}) draft on true`,
      ),
    )
    .first('id')
    .where({ id: adminFeeId, 'draft.removedAt': null, 'af.removedAt': null })
    .then((res) => !res);

const anyAdminFeesDeleted = async (knex: Knex, adminFeeIds: Id[]): Promise<boolean> =>
  knex({ af: 'admin_fees' })
    .leftJoin(
      knex.raw(
        `LATERAL (${knex({ af2: 'admin_fees' })
          .first(['removedAt'])
          .where('af2.draftId', knex.raw('af.id'))
          .toString()}) draft on true`,
      ),
    )
    .first('id')
    .whereIn('id', adminFeeIds)
    .where((qb) => qb.whereNot({ 'draft.removedAt': null }).orWhereNot({ 'af.removedAt': null }))
    .then((res) => !!res);

const getAdminFeesWithComputedFields = async (knex: Knex): Promise<AdminFeeWithComputedValues[]> =>
  knex({ af: 'admin_fees' })
    .select({
      id: 'af.id',
      name: knex.raw('coalesce(draft.name, af.name)'),
      active: 'af.active',
      percent: 'af.percent',
      nextMonthActive: knex.raw(
        `case when draft."removedAt" is not null
          then false
          else draft.active
        end`,
      ),
      nextMonthPercent: knex.raw(
        `case when draft."removedAt" is not null
          then null
          else draft.percent
        end`,
      ),
      isRunning: knex.raw('coalesce(r."affiliateId"::boolean, false)'),
      createdAt: 'af.createdAt',
      updatedAt: knex.raw('greatest(draft."updatedAt", af."updatedAt")'),
      draftRemovedAt: 'draft.removedAt',
    })
    .leftJoin(
      knex.raw(`LATERAL (
        ${knex({ af2: 'admin_fees' })
          .first(['*'])
          .where('af2.draftId', knex.raw('af.id'))
          .toString()}) draft ON true`),
    )
    .leftJoin(
      knex.raw(`LATERAL (
        ${knex({ afa: 'admin_fee_affiliates' })
          .first('afa.affiliateId')
          .where('afa.adminFeeId', knex.raw('af.id'))
          .where('af.active', true)
          .whereRaw('period @> now()::date')
          .toString()}) r on true`),
    )
    .where({ 'af.removedAt': null, 'af.draftId': null })
    .orderBy('af.id', 'asc');

const getAdminFeeWithAffiliates = async (
  knex: Knex,
  adminFeeId: Id,
): Promise<?AdminFeeWithAffiliates> => {
  const rulesJsonQuery = knex({ afr1: 'admin_fee_rules' })
    .select([
      'afr1.adminFeeId',
      {
        rules: knex.raw(
          `json_agg(
              json_build_object(
                'countryId', afr1."countryId",
                'percent', afr1."percent",
                'nextMonthPercent', draft."percent"
              )
            )`,
        ),
      },
    ])
    .leftJoin(
      knex.raw(`LATERAL (
        ${knex({ afr2: 'admin_fee_rules' })
          .first(['id', 'percent', 'removedAt'])
          .where({
            'afr2.draftId': knex.raw('afr1.id'),
            'afr2.removedAt': null,
          })
          .toString()}) draft ON true`),
    )
    .where({ adminFeeId, draftId: null, 'afr1.removedAt': null })
    .groupBy('adminFeeId');
  const affiliatesJsonQuery = knex('admin_fee_affiliates as afa')
    .select({
      adminFeeId: 'afa.adminFeeId',
      affiliates: knex.raw(
        `json_build_object(
          'affiliateId', a.id,
          'affiliateName', a.name,
          'affiliateEmail', a.email,
          'brands', json_agg(
            json_build_object(
              'brandId', afa."brandId",
              'periodFrom', lower(afa.period),
              'periodTo', (upper(afa.period) - interval '1 day')::date
            )
          )
        )`,
      ),
    })
    .leftJoin('affiliates as a', 'a.id', '=', 'afa.affiliateId')
    .where({ adminFeeId })
    .whereNull('afa.removedAt')
    .whereRaw('upper(afa.period) > now()')
    .groupBy('afa.adminFeeId', 'a.id');
  const [fee] = await knex('admin_fees as af')
    .with('fr', rulesJsonQuery)
    .with('fa', affiliatesJsonQuery)
    .leftJoin(
      knex.raw(
        `LATERAL (${knex({ af2: 'admin_fees' })
          .first(['*'])
          .where('af2.draftId', knex.raw('af.id'))
          .toString()}) draft on true`,
      ),
    )
    .leftJoin(
      knex.raw(`LATERAL (
          select * from fr where "adminFeeId" = af.id limit 1
        ) s on true`),
    )
    .leftJoin(
      knex.raw(`LATERAL (
          select json_agg(affiliates) as affiliates from fa where "adminFeeId" = af.id group by "adminFeeId"
        ) t on true`),
    )
    .leftJoin(
      knex.raw(`LATERAL (
          ${knex({ afa: 'admin_fee_affiliates' })
            .first('afa.affiliateId')
            .where('afa.adminFeeId', knex.raw('af.id'))
            .where('af.active', true)
            .whereRaw('period @> now()::date')
            .toString()}
          ) r on true`),
    )
    .select([
      {
        name: knex.raw('coalesce(draft.name, af.name)'),
        active: knex.raw('coalesce(draft.active, af.active)'),
        percent: knex.raw(`af."percent"`),
        nextMonthPercent: knex.raw(
          `case when draft."removedAt" is not null
            then null
            else draft.percent
          end`,
        ),
        draftRemovedAt: 'draft.removedAt',
        isRunning: knex.raw('coalesce(r."affiliateId"::boolean, false)'),
        createdAt: 'af.createdAt',
        updatedAt: 'draft.updatedAt',
        rules: knex.raw(`coalesce(s.rules, '[]')`),
        affiliates: knex.raw(`coalesce(t.affiliates, '[]')`),
      },
    ])
    .where({
      'af.id': adminFeeId,
      'af.removedAt': null,
    });
  return fee;
};

const createAdminFee = async (
  knex: Knex,
  feeDraft: AdminFeeDraft,
  userId: Id,
): Promise<AdminFee> => {
  const [{ id: adminFeeId }] = await knex('admin_fees')
    .insert({ ...feeDraft, percent: null, createdBy: userId })
    .returning(['id']);
  const [{ id, draftId, ...adminFeeDraft }] = await knex('admin_fees')
    .insert({ ...feeDraft, draftId: adminFeeId, createdBy: userId })
    .returning('*');
  return { id: adminFeeId, ...adminFeeDraft };
};

const updateAdminFee = async (
  knex: Knex,
  adminFeeId: Id,
  { name, percent, active }: AdminFeeDraft,
): Promise<AdminFee> => {
  const [updatedFee] = await knex('admin_fees')
    .where({ draftId: adminFeeId })
    .where((qb) => qb.whereNot({ name }).orWhereNot({ percent }).orWhereNot({ active }))
    .update({ name, percent, active, updatedAt: DateTime.utc(), removedAt: null })
    .returning('*');
  return updatedFee;
};

const createAdminFeeRule = async (
  knex: Knex,
  adminFeeId: Id,
  rule: AdminFeeRuleDraft,
): Promise<AdminFeeRule> => {
  const [{ id: adminFeeRuleId }] = await knex('admin_fee_rules')
    .insert({ ...rule, adminFeeId, percent: null })
    .returning(['id']);
  const [{ id, draftId, ...ruleDraft }] = await knex('admin_fee_rules')
    .insert({ ...rule, adminFeeId, draftId: adminFeeRuleId })
    .returning('*');
  return { id: draftId, ...ruleDraft };
};
const updateAdminFeeRule = async (
  knex: Knex,
  adminFeeId: Id,
  { countryId, percent }: AdminFeeRuleDraft,
): Promise<AdminFeeRule> => {
  const [updatedRule] = await knex('admin_fee_rules')
    .where({ adminFeeId, countryId })
    .whereNot({ draftId: null, percent })
    .update({ percent, updatedAt: DateTime.utc(), removedAt: null })
    .returning('*');
  return updatedRule;
};

const deleteAdminFeeRule = async (
  knex: Knex,
  adminFeeId: Id,
  { countryId }: AdminFeeRuleDraft,
): Promise<AdminFeeRule> => {
  const [deletedRule] = await knex('admin_fee_rules')
    .where({ adminFeeId, countryId })
    .whereNot({ draftId: null })
    .update({ removedAt: DateTime.utc() })
    .returning('*');
  return deletedRule;
};

const deleteAdminFee = async (knex: Knex, adminFeeId: Id): Promise<AdminFee> => {
  const [deletedFee] = await knex('admin_fees')
    .where({ draftId: adminFeeId })
    .update({ removedAt: DateTime.utc() })
    .returning('*');
  return deletedFee;
};

const createAdminFeeRuleSet = async (
  knex: Knex,
  adminFeeId: Id,
  rules: AdminFeeRuleDraft[],
): Promise<AdminFeeRule[]> =>
  Promise.all(rules.map(async (rule) => createAdminFeeRule(knex, adminFeeId, rule)));

type syncAdminFeeRuleSetResult = {
  createdRules: AdminFeeRule[],
  updatedRules: AdminFeeRule[],
  deletedRules: AdminFeeRule[],
};
const syncAdminFeeRuleSet = async (
  knex: Knex,
  adminFeeId: Id,
  rulesDraft: AdminFeeRuleDraft[],
): Promise<syncAdminFeeRuleSetResult> => {
  const newRules = rulesDraft.map((r) => ({ ...r, adminFeeId }));
  const existingRules = await knex('admin_fee_rules')
    .where({ adminFeeId })
    .whereNot({ draftId: null });

  const deletedRules = await Promise.all(
    _.differenceBy(existingRules, newRules, 'countryId').map(async (rule) =>
      deleteAdminFeeRule(knex, adminFeeId, rule),
    ),
  );
  const createdRules = await Promise.all(
    _.differenceBy(newRules, existingRules, 'countryId').map(async (rule) =>
      createAdminFeeRule(knex, adminFeeId, rule),
    ),
  );
  const updatedRules = await Promise.all(
    _.differenceBy(newRules, [...createdRules, ...deletedRules], 'countryId').map(
      async (ruleUpdate) => updateAdminFeeRule(knex, adminFeeId, ruleUpdate),
    ),
  );
  return { createdRules, updatedRules: _.compact(updatedRules), deletedRules };
};

module.exports = {
  isAdminFeeDeleted,
  anyAdminFeesDeleted,
  getAdminFee,
  getAdminFeesWithComputedFields,
  getAdminFeeWithAffiliates,
  getAdminFeeRules,
  createAdminFee,
  createAdminFeeRule,
  updateAdminFee,
  deleteAdminFee,
  createAdminFeeRuleSet,
  syncAdminFeeRuleSet,
};
