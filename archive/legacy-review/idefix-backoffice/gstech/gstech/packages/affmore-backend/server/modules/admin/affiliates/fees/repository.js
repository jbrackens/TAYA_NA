// @flow
import type {
  AffiliateAdminFeeWithRules,
  AffiliateViewAdminFeeWithRules,
  AffiliateAdminFee,
  AffiliateAdminFeeDraft,
} from '../../../../../types/repository/affiliate-admin-fees';

const { DateTime } = require('luxon');
const { upsert2, serializeDateRange } = require('gstech-core/modules/knex');

const { DEFAULT_FEE_PERCENT } = require('../../../../../types/constants');

const getAffiliateAdminFees = async (
  knex: Knex,
  affiliateId: Id,
): Promise<AffiliateAdminFeeWithRules[]> => {
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
            )::jsonb`,
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
    .where({ draftId: null, 'afr1.removedAt': null })
    .groupBy('adminFeeId');
  return await knex('admin_fee_affiliates as afa')
    .with('fr', rulesJsonQuery)
    .leftJoin(
      knex.raw(
        `LATERAL (${knex({ af2: 'admin_fees' })
          .first(['*'])
          .where('af2.draftId', knex.raw('afa."adminFeeId"'))
          .toString()}) daf on true`,
      ),
    )
    .leftJoin('admin_fees as af', 'af.id', '=', 'afa.adminFeeId')
    .leftJoin('fr', 'fr.adminFeeId', '=', 'afa.adminFeeId')
    .select(
      'afa.adminFeeId',
      'afa.affiliateId',
      'afa.brandId',
      'af.percent',
      'af.active',
      'afa.createdBy',
      {
        name: knex.raw(`coalesce(daf.name, af.name)`),
        affiliateFeeId: 'afa.id',
        periodFrom: knex.raw(`lower(afa.period)`),
        periodTo: knex.raw(`(upper(afa.period) - interval '1 day')::date`),
        nextMonthPercent: 'daf.percent',
        draftRemovedAt: 'daf.removedAt',
        isRunning: knex.raw('period @> now()::date'),
        rules: knex.raw(`(coalesce(fr.rules, '[]'))::json`),
      },
      'afa.createdAt',
      'afa.updatedAt',
    )
    .where({ affiliateId, 'af.active': true, 'af.removedAt': null, 'afa.removedAt': null })
    .whereRaw('upper(afa.period) > now()')
    .groupBy(
      'afa.id',
      'af.name',
      'af.percent',
      'daf.name',
      'daf.percent',
      'daf.removedAt',
      'af.active',
      'fr.rules',
    )
    .orderBy(['periodFrom', 'afa.brandId']);
};

const getAffiliateViewAdminFees = async (
  knex: Knex,
  affiliateId: Id,
): Promise<AffiliateViewAdminFeeWithRules[]> => {
  const rulesJsonQuery = knex({ afr1: 'admin_fee_rules' })
    .select([
      'afr1.adminFeeId',
      {
        rules: knex.raw(
          `json_agg(
              json_build_object(
                'countryId', afr1."countryId",
                'percent', afr1."percent"
              )
            )::jsonb`,
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
    .where({ draftId: null, 'afr1.removedAt': null })
    .groupBy('adminFeeId');
  return await knex('admin_fee_affiliates as afa')
    .with('fr', rulesJsonQuery)
    .leftJoin(
      knex.raw(
        `LATERAL (${knex({ af2: 'admin_fees' })
          .first(['*'])
          .where('af2.draftId', knex.raw('afa."adminFeeId"'))
          .toString()}) draft on true`,
      ),
    )
    .leftJoin('admin_fees as af', 'af.id', '=', 'afa.adminFeeId')
    .leftJoin('fr', 'fr.adminFeeId', '=', 'afa.adminFeeId')
    .select(
      'afa.adminFeeId',
      'afa.affiliateId',
      'afa.brandId',
      'af.percent',
      'af.active',
      'afa.createdBy',
      {
        name: knex.raw(`coalesce(draft.name, af.name)`),
        affiliateFeeId: 'afa.id',
        periodFrom: knex.raw(`lower(afa.period)`),
        periodTo: knex.raw(`(upper(afa.period) - interval '1 day')::date`),
        isRunning: knex.raw('period @> now()::date'),
        rules: knex.raw(`(coalesce(fr.rules, '[]'))::json`),
      },
    )
    .where({ affiliateId, 'af.active': true, 'af.removedAt': null, 'afa.removedAt': null })
    .whereRaw('upper(afa.period) > now()')
    .groupBy('afa.id', 'af.name', 'draft.name', 'af.percent', 'af.active', 'fr.rules')
    .orderBy(['periodFrom', 'afa.brandId']);
};

const getCurrentFeeScheduleForAffiliate = async (
  knex: Knex,
  affiliateId: Id,
  brandId: BrandId,
): Promise<AffiliateAdminFee[]> =>
  knex('admin_fee_affiliates')
    .select([{ affiliateFeeId: 'id' }, 'affiliateId', 'adminFeeId', 'brandId', 'period'])
    .where({ affiliateId, brandId, removedAt: null })
    .whereRaw('upper(period) > now()');

const getRunningFeeSchedulesUsingAdminFeeId = async (
  knex: Knex,
  adminFeeId: Id,
): Promise<AffiliateAdminFee[]> =>
  knex('admin_fee_affiliates')
    .select(['id', 'affiliateId', 'adminFeeId', 'brandId', 'period'])
    .where({ adminFeeId, removedAt: null, draftId: null })
    .whereRaw('period @> now()::date');

const getAffiliateAdminFee = async (
  knex: Knex,
  affiliateId: Id,
  adminFeeId: Id,
  brandId: BrandId,
): Promise<?AffiliateAdminFee> =>
  knex('admin_fee_affiliates').first().where({ affiliateId, adminFeeId, brandId, removedAt: null });

const upsertAffiliateAdminFee = async (
  knex: Knex,
  affiliateFeeDraft: AffiliateAdminFeeDraft,
  userId: Id,
): Promise<AffiliateAdminFee> => {
  const now = DateTime.utc();
  return await upsert2(
    knex,
    'admin_fee_affiliates',
    { ...affiliateFeeDraft, createdBy: userId, createdAt: now, updatedAt: now },
    ['affiliateId', 'brandId'],
    ['createdAt'],
  );
};

const createAffiliateAdminFee = async (
  knex: Knex,
  affiliateId: Id,
  createdBy: Id,
  // TODO - is there a better way to specify this type? - check affiliates/fees/routes.js:151 for error
  {
    brandId,
    period,
    adminFeeId,
  }: { period: AffiliateAdminFeeDraft['period'], ...Partial<AffiliateAdminFeeDraft> },
): Promise<AffiliateAdminFee> =>
  knex('admin_fee_affiliates')
    .insert({
      affiliateId,
      brandId,
      adminFeeId,
      createdBy,
      period: serializeDateRange(period),
      createdAt: new Date(),
    })
    .returning('*');

const updateAffiliateAdminFee = async (
  knex: Knex,
  { affiliateFeeId: id, period, ...feeDraft }: AffiliateAdminFeeDraft,
): Promise<Array<AffiliateAdminFee>> =>
  knex('admin_fee_affiliates')
    .update({ ...feeDraft, period: serializeDateRange(period), updatedAt: new Date() })
    .where({ id })
    .returning('*');

const cutScheduleShort = async (knex: Knex, id: Id): Promise<Array<AffiliateAdminFee>> =>
  knex('admin_fee_affiliates')
    .update({
      period: knex.raw(`
        daterange(
          lower(period),
          (date_trunc('month', now()) + INTERVAL '1 month')::date
        )
      `),
      updatedAt: new Date(),
    })
    .where({ id })
    .returning('*');

const draftDeleteAffiliateAdminFee = async (knex: Knex, id: Id): Promise<AffiliateAdminFee> => {
  const [{ id: draftId, period, ...scheduleCutShort }] = await cutScheduleShort(knex, id);
  const draftDelete = await upsert2(
    knex,
    'admin_fee_affiliates',
    {
      ...scheduleCutShort,
      period: serializeDateRange(period),
      draftId,
      removedAt: new Date(),
    },
    ['draftId'],
    ['createdAt'],
  );
  return draftDelete;
};

const deleteAffiliateAdminFeesUsingAdminFeeId = async (
  knex: Knex,
  adminFeeId: Id,
): Promise<AffiliateAdminFee[]> =>
  knex('admin_fee_affiliates')
    .update({ removedAt: new Date() })
    .where({ adminFeeId })
    .whereRaw('lower(period) > now()')
    .returning('*');

const undoDraftDeleteAffiliateAdminFee = async (knex: Knex, draftId: Id): Promise<number> =>
  knex('admin_fee_affiliates').where({ draftId }).whereNot({ removedAt: null }).del();

const deleteAffiliateAdminFees = async (
  knex: Knex,
  affiliateFeeIds: Id[],
): Promise<AffiliateAdminFee[]> =>
  knex('admin_fee_affiliates')
    .update({ removedAt: new Date() })
    .whereIn('id', affiliateFeeIds)
    .whereRaw('lower(period) > now()')
    .returning('*');

const getApplicableAffiliateAdminFee = async (
  knex: Knex,
  affiliateId: Id,
  brandId: BrandId,
  countryId: CountryId,
  year: number,
  month: number,
  day: number,
): Promise<number> =>
  knex({ afa: 'admin_fee_affiliates' })
    .leftJoin({ af: 'admin_fees' }, (qb) => {
      qb.on('af.id', '=', 'afa.adminFeeId')
        .on('af.active', '=', knex.raw('?', true))
        .onNull('af.draftId')
        .onNull('af.removedAt');
    })
    .leftJoin({ afr: 'admin_fee_rules' }, (qb) => {
      qb.on('afr.adminFeeId', '=', 'af.id')
        .on('afr.countryId', '=', knex.raw('?', countryId))
        .onNull('afr.draftId')
        .onNull('afr.removedAt');
    })
    .first({ percent: knex.raw('coalesce(afr.percent, af.percent)') })
    .where({ affiliateId, brandId })
    .whereRaw('afa.period @> make_date(:year, :month, :day) ', { year, month, day })
    .where({ 'afa.removedAt': null, 'afa.draftId': null })
    .then((result) => result?.percent || DEFAULT_FEE_PERCENT);

module.exports = {
  getAffiliateAdminFees,
  getAffiliateViewAdminFees,
  getAffiliateAdminFee,
  upsertAffiliateAdminFee,
  createAffiliateAdminFee,
  updateAffiliateAdminFee,
  deleteAffiliateAdminFees,
  undoDraftDeleteAffiliateAdminFee,
  cutScheduleShort,
  getCurrentFeeScheduleForAffiliate,
  getRunningFeeSchedulesUsingAdminFeeId,
  draftDeleteAffiliateAdminFee,
  deleteAffiliateAdminFeesUsingAdminFeeId,
  getApplicableAffiliateAdminFee,
};
