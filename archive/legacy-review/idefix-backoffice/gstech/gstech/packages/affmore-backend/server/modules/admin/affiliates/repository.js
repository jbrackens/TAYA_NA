// @flow
import type { Activity } from '../../../../types/repository/activities';
import type {
  AffiliateUpdateDraft,
  AffiliateAdminUpdateDraft,
  InsertAffiliateDraft,
  Affiliate,
  AffiliateOverview,
  Revenue,
} from '../../../../types/repository/affiliates';

const { DateTime } = require('luxon');
const _ = require('lodash');

const { affmoreBrands } = require('../../../../types/constants');
const { getAffiliatesPlayersCount, getAffiliatesDepositingPlayersCount, getAffiliatesPlayerActivities } = require('./players/repository');
const { getAffiliatesBalance } = require('../payments/repository');

const createAffiliate = async (knex: Knex, affiliateDraft: InsertAffiliateDraft): Promise<Affiliate> => {
  const now = DateTime.utc();
  const [affiliate] = await knex('affiliates')
    .insert({ ...affiliateDraft, createdAt: now, updatedAt: now, lastLoginDate: now })
    .returning('*');

  return affiliate;
};

const updateAffiliate = async (knex: Knex, affiliateId: Id, affiliateDraft: AffiliateUpdateDraft | AffiliateAdminUpdateDraft): Promise<Affiliate> => {
  const now = DateTime.utc();
  const [affiliate] = await knex('affiliates')
    .update({ ...affiliateDraft, updatedAt: now })
    .where({ id: affiliateId })
    .returning('*');

  return affiliate;
};

const acceptTC = async (knex: Knex, affiliateId: Id, tcVersion: number): Promise<Affiliate> => {
  const now = DateTime.utc();
  const [affiliate] = await knex('affiliates')
    .update({ tcVersion, updatedAt: now })
    .where({ id: affiliateId })
    .returning('*');

  return affiliate;
};

const updateLastLoginDate = async (knex: Knex, affiliateId: Id): Promise<Affiliate> => {
  const now = DateTime.utc();
  const [affiliate] = await knex('affiliates')
    .update({ lastLoginDate: now })
    .where({ id: affiliateId })
    .returning('*');

  return affiliate;
};

const updateAffiliateAPIToken = async (knex: Knex, affiliateId: Id, apiToken: string): Promise<Affiliate> => {
  const [affiliate] = await knex('affiliates')
    .update({ apiToken })
    .where({ id: affiliateId })
    .returning('*');

  return affiliate;
};

const getAffiliates = async (knex: Knex): Promise<Affiliate[]> => {
  const affiliates = await knex('affiliates')
    .select('id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion','createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .orderBy('affiliates.createdAt', 'desc')
    .orderBy('affiliates.id');

  return affiliates;
};

const getAffiliatesOverview = (knex: Knex, year: number, month: number, filter: { brandId?: BrandId, excludeInternals?: boolean } = { }): Knex$QueryBuilder<AffiliateOverview[]> => {
  const { brandId, excludeInternals } = filter;
  const query = knex('affiliates')
    .select('affiliates.id', 'affiliates.floorBrandCommission',
      knex.raw('(COALESCE("registeredPlayers"."registeredPlayers", 0))::INT as "registeredPlayers"'),
      knex.raw('(COALESCE("depositingPlayers"."depositingPlayers", 0))::INT as "depositingPlayers"'),
      knex.raw('(COALESCE("activities"."activePlayers", 0))::INT as "activePlayers"'),
      knex.raw('(COALESCE("newRegisteredPlayers"."registeredPlayers", 0))::INT as "newRegisteredPlayers"'),
      knex.raw('(COALESCE("newDepositingPlayers"."depositingPlayers", 0))::INT as "newDepositingPlayers"'),
      knex.raw('COALESCE(ceil(("newDepositingPlayers"."depositingPlayers")::decimal / NULLIF(("newRegisteredPlayers"."registeredPlayers"), 0) * 100), 0) as "conversionRate"'),
      knex.raw('(COALESCE("activities"."netRevenue", 0))::INT as "netRevenue"'),
      knex.raw('(COALESCE("activities"."deposits", 0))::INT AS "deposits"'),
      knex.raw('(COALESCE("activities"."commission", 0))::INT as "commission"'),
      knex.raw(`(COALESCE("activities"."commissions", '[{}]'::json)) as commissions`),
      knex.raw('(COALESCE("activities"."cpa", 0))::INT as "cpa"'),
      knex.raw('(COALESCE("payments"."balance", 0))::INT as "balance"'))
    .leftJoin(getAffiliatesPlayerActivities(knex, year, month)
      .modify(qb => brandId && qb.where({ brandId }))
      .as('activities'), 'activities.affiliateId', 'affiliates.id')
    .leftJoin(getAffiliatesPlayersCount(knex)
      .modify(qb => brandId && qb.where({ brandId }))
      .as('registeredPlayers'), 'registeredPlayers.affiliateId', 'affiliates.id')
    .leftJoin(getAffiliatesDepositingPlayersCount(knex, year, month)
      .modify(qb => brandId && qb.where({ brandId }))
      .as('depositingPlayers'), 'depositingPlayers.affiliateId', 'affiliates.id')
    .leftJoin(getAffiliatesPlayersCount(knex, year, month)
      .modify(qb => brandId && qb.where({ brandId }))
      .as('newRegisteredPlayers'), 'newRegisteredPlayers.affiliateId', 'affiliates.id')
    .leftJoin(getAffiliatesDepositingPlayersCount(knex, year, month, true)
      .modify(qb => brandId && qb.where({ brandId }))
      .as('newDepositingPlayers'), 'newDepositingPlayers.affiliateId', 'affiliates.id')
    .leftJoin(getAffiliatesBalance(knex).as('payments'), 'payments.affiliateId', 'affiliates.id')
    .orderBy('affiliates.name')

  if (excludeInternals) query.where({ 'affiliates.isInternal': false });

  return query;
};

const getAffiliate = async (knex: Knex, affiliateId: Id): Promise<?Affiliate> => {
  const [affiliate] = await knex('affiliates')
    .select('affiliates.id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', knex.raw('SUM("payments"."amount") as "accountBalance"'), 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion', 'createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .leftJoin('payments', 'payments.affiliateId', 'affiliates.id')
    .where({ 'affiliates.id': affiliateId })
    .groupBy('affiliates.id');

  return affiliate;
};

const getAffiliateByToken = async (knex: Knex, apiToken: string): Promise<?Affiliate> => {
  const [affiliate] = await knex('affiliates')
    .select('affiliates.id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', knex.raw('SUM("payments"."amount") as "accountBalance"'), 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion', 'createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .leftJoin('payments', 'payments.affiliateId', 'affiliates.id')
    .where({ 'affiliates.apiToken': apiToken })
    .groupBy('affiliates.id');

  return affiliate;
};

const getAffiliateOverview = (knex: Knex, affiliateId: Id, year: number, month: number): Knex$QueryBuilder<AffiliateOverview> => {
  const query: any = getAffiliatesOverview(knex, year, month)
    .where({ id: affiliateId })
    .first();

  return query;
};

const getAffiliateRevenues = async (knex: Knex, affiliateId: Id, year?: number, month?: number, brandId?: BrandId): Promise<Revenue[]> => {
  const revenues = await knex('activities')
    .select('players.affiliateId', 'activities.playerId', 'players.planId', 'players.countryId', 'players.brandId', 'plans.name as deal', 'links.name as link', 'clicks.clickDate', 'clicks.referralId', 'clicks.segment', 'players.registrationDate',
      knex.raw('SUM("deposits") as "deposits"'),
      knex.raw('SUM("turnover") as "turnover"'),
      knex.raw('SUM("grossRevenue") as "grossRevenue"'),
      knex.raw('SUM("bonuses") as "bonuses"'),
      knex.raw('SUM("adjustments") as "adjustments"'),
      knex.raw('SUM("fees") as "fees"'),
      knex.raw('SUM("tax") as "tax"'),
      knex.raw('SUM("netRevenue") as "netRevenue"'),
      knex.raw('SUM("commission") as "commission"'),
      knex.raw(`json_build_object(
        ${affmoreBrands.map(b => `'${b.id}',COALESCE(SUM(activities."commission") FILTER (WHERE players."brandId" = '${b.id}'), 0)`).join(',')}
        ) as commissions`),
      knex.raw('SUM(activities."cpa") as "cpa"'))
    .leftJoin('players', 'players.id', 'activities.playerId')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .leftJoin('clicks', 'clicks.id', 'players.clickId')
    .where({ 'players.affiliateId': affiliateId })
    .where((qb: Knex$QueryBuilder<any>) => {
      if (year && month) {
        qb.where('activities.activityDate', '>=', DateTime.local(year, month, 1));
        qb.where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }));
      }
      if (brandId) qb.where({ 'players.brandId': brandId });
    })
    .groupByRaw('players."affiliateId", activities."playerId", players."countryId", players."planId", players."brandId", "deal", "link", "clickDate", "referralId", "segment", players."registrationDate"')
    .orderBy('activities.playerId');

  return revenues;
};

const getAffiliateActivities = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<Activity[]> => {
  const activities = await knex('activities')
    .select('activities.id', 'activities.playerId', 'players.brandId', 'activities.activityDate', 'activities.deposits', 'activities.turnover', 'activities.grossRevenue', 'activities.bonuses', 'activities.adjustments', 'activities.fees', 'activities.tax', 'activities.netRevenue', 'activities.commission', 'activities.cpa')
    .leftJoin('players', 'players.id', 'activities.playerId')
    .where({ 'players.affiliateId': affiliateId })
    .where('activities.activityDate', '>=', DateTime.local(year, month, 1))
    .where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }))
    .orderBy('activities.activityDate')
    .orderBy('activities.playerId');

  return activities;
};

const getSubAffiliates = async (knex: Knex, parentId: Id): Promise<{ id: Id, name: string, floorBrandCommission: boolean, commissionShare: number, }[]> => {
  const affiliates = await knex('sub_affiliates')
    .select('affiliates.id', 'affiliates.name', 'affiliates.floorBrandCommission', 'sub_affiliates.commissionShare')
    .leftJoin('affiliates', 'affiliates.id', 'sub_affiliates.affiliateId')
    .where({ parentId })
    .orderBy('sub_affiliates.id');

  return affiliates;
};

const findAffiliateByEmail = async (knex: Knex, email: string): Promise<?Affiliate> => {
  const [affiliate] = await knex('affiliates')
    .select('id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion', 'createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .where(knex.raw(`lower(affiliates.email) = :email`, { email }))
    .orderBy('affiliates.name')
    .orderBy('affiliates.id');

  return affiliate;
};

const updateAffiliatePassword = async (knex: Knex, affiliateId: Id, hash: string, salt: string): Promise<?Affiliate> => {
  const now = DateTime.utc();
  const [affiliate] = await knex('affiliates')
    .update({ hash, salt, updatedAt: now })
    .where({ id: affiliateId })
    .returning('*');

  return affiliate;
};

const getCumulativeDeposit = async (knex: Knex, playerId: Id, year: number, month: number, day: number): Promise<Money> => {
  const [activity] = await knex('activities')
    .select(knex.raw('SUM("deposits") as "deposits"'))
    .where({ 'activities.playerId': playerId })
    .where('activities.activityDate', '<', DateTime.local(year, month, day));

  return +activity.deposits;
};

const getActiveAffiliates = async (knex: Knex, year: number, month: number): Promise<Affiliate[]> => {
  const affiliates = await knex('affiliates')
    .select('affiliates.id', 'hash', 'salt', 'affiliates.name', 'contactName', 'email', 'affiliates.countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', knex.raw('"paymentMethodDetails"::text'), 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion', 'createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .leftJoin('players', 'players.affiliateId', 'affiliates.id')
    .leftJoin('activities', 'activities.playerId', 'players.id')
    .leftJoin('sub_affiliates', 'sub_affiliates.parentId', 'affiliates.id')
    .leftJoin('players as subPlayers', 'subPlayers.affiliateId', 'sub_affiliates.affiliateId')
    .leftJoin('activities as subActivities', 'subActivities.playerId', 'subPlayers.id')
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.where('activities.activityDate', '>=', DateTime.local(year, month, 1));
      qb.where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }));

      return qb;
    }).orWhere((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      qb.where('subActivities.activityDate', '>=', DateTime.local(year, month, 1));
      qb.where('subActivities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }));

      return qb;
    })
    .distinct()
    .orderBy('affiliates.name')
    .orderBy('affiliates.id');

  return affiliates;
};

const calculateCommissions = async (knex: Knex, playerId: Id, year: number, month: number, nrs: number): Promise<Activity[]> => {
  const activities = await knex('activities')
    .update({ commission: knex.raw(`activities."netRevenue" * ${nrs / 100}`) })
    .where({ playerId })
    .where('activities.activityDate', '>=', DateTime.local(year, month))
    .where('activities.activityDate', '<', DateTime.local(year, month).plus({ month: 1 }))
    .orderBy('activities.id')
    .returning('*');
  // sorting on a code level as 'returning('*')' does not guarantee determinated order
  return _.sortBy(activities, ['id']);
};

const closeMonth = async (knex: Knex, year: number, month: number, userId: Id): Promise<void> => {
  const now = DateTime.utc();
  await knex('closed_months').insert({ month, year, createdBy: userId, createdAt: now });
};

const isMonthClosed = async (knex: Knex, year: number, month: number): Promise<boolean> => {
  const result = await knex('closed_months').select('id').where({ month, year }).first();
  return !!result;
};

module.exports = {
  createAffiliate,
  getAffiliates,
  getAffiliatesOverview,
  getAffiliate,
  getAffiliateByToken,
  getAffiliateOverview,
  getAffiliateRevenues,
  updateAffiliate,
  acceptTC,
  updateLastLoginDate,
  updateAffiliateAPIToken,
  getAffiliateActivities,
  getSubAffiliates,
  findAffiliateByEmail,
  updateAffiliatePassword,
  getCumulativeDeposit,
  getActiveAffiliates,
  calculateCommissions,
  closeMonth,
  isMonthClosed,
};
