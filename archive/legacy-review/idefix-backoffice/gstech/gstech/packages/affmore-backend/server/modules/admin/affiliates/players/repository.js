// @flow
import type { ActivityDraft, Activity } from '../../../../../types/repository/activities';
import type { Revenue } from '../../../../../types/repository/affiliates';

export type PlayerUpdateDraft = {
  affiliateId: Id,
  planId: Id,
  linkId: Id,
};

export type PlayerInsertDraft = {
  id: Id,
  ...PlayerUpdateDraft,
  clickId: ?Id,

  brandId: BrandId,
  countryId: CountryId,
  registrationDate: Date,
};

export type Player = PlayerInsertDraft;

export type PlayerWithInfo = {
  deal: string,
  link: string,
} & Player;

const { DateTime } = require('luxon');
const { upsert2 } = require('gstech-core/modules/knex');
const { affmoreBrands } = require('../../../../../types/constants');

const getPlayer = async (knex: Knex, affiliateId: Id, playerId: Id): Promise<?PlayerWithInfo> => {
  const [player] = await knex('players')
    .select('players.id', 'players.affiliateId', 'players.planId', 'players.linkId', 'players.clickId', 'players.brandId', 'players.countryId', 'players.registrationDate', 'plans.name as deal', 'links.name as link')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .where({ 'players.id': playerId, 'players.affiliateId': affiliateId });

  return player;
};

const getPlayerById = async (knex: Knex, playerId: Id): Promise<?PlayerWithInfo> => {
  const [player] = await knex('players')
    .select('players.id', 'players.affiliateId', 'players.planId', 'players.linkId', 'players.clickId', 'players.brandId', 'players.countryId', 'players.registrationDate', 'plans.name as deal', 'links.name as link')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .where({ 'players.id': playerId });
  return player;
};


const updatePlayer = async (knex: Knex, playerId: Id, playerDraft: Partial<PlayerUpdateDraft>): Promise<?Player> => {
  const [player] = await knex('players')
    .update({ ...playerDraft })
    .where({ id: playerId })
    .returning('*');

  return player;
};

const getPlayerActivities = async (knex: Knex, affiliateId: Id, playerId: Id, year?: number, month?: number): Promise<Activity[]> => {
  const activities = await knex('activities')
    .select('activities.id', 'activities.playerId', 'players.brandId', 'activities.activityDate', 'activities.deposits', 'activities.turnover', 'activities.grossRevenue', 'activities.bonuses', 'activities.adjustments', 'activities.fees', 'activities.tax', 'activities.netRevenue', 'activities.commission', 'activities.cpa')
    .leftJoin('players', 'players.id', 'activities.playerId')
    .where({ 'activities.playerId': playerId, 'players.affiliateId': affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (year && month) {
        qb.where('activities.activityDate', '>=', DateTime.local(year, month, 1));
        qb.where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }));
      }

      return qb;
    })
    .orderBy('activities.activityDate');

  return activities;
};

const getAffiliatePlayers = async (knex: Knex, affiliateId: Id, year?: number, month?: number, brandId?: BrandId): Promise<Revenue[]> => { // TODO: type structure is correct by type name is confusing
  const players = await knex('players')
    .select('players.affiliateId', 'players.id as playerId', 'players.planId', 'players.countryId', 'players.brandId', 'plans.name as deal', 'links.name as link', 'clicks.clickDate', 'clicks.referralId', 'clicks.segment', 'players.registrationDate',
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
    .leftJoin('activities', 'players.id', 'activities.playerId')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .leftJoin('clicks', 'clicks.id', 'players.clickId')
    .where({ 'players.affiliateId': affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (year && month) {
        qb.where('activities.activityDate', '>=', DateTime.local(year, month, 1));
        qb.where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }));
      }
      if (brandId) {
        qb.where({ 'players.brandId': brandId });
      }

      return qb;
    })
    .groupByRaw('players."affiliateId", players.id, players."countryId", players."planId", players."brandId", "deal", "link", "clickDate", "referralId", "segment", players."registrationDate"')
    .orderBy('players.id');

  return players;
};

const getActiveAffiliatePlayers = async (knex: Knex, affiliateId: Id): Promise<PlayerWithInfo[]> => {
  const players = await knex('players')
    .select('players.id', 'players.affiliateId', 'players.planId', 'players.linkId', 'players.clickId', 'players.brandId', 'players.countryId', 'players.registrationDate', 'plans.name as deal', 'links.name as link')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .where({ 'players.affiliateId': affiliateId })
    .distinct()
    .orderBy('players.id');

  return players;
};

const getAffiliatesPlayersCount = (knex: Knex, year?: number, month?: number): Knex$QueryBuilder<{ affiliateId: Id, registeredPlayers: number, }[]> => {
  const query = knex('affiliates')
    .select('affiliates.id as affiliateId', knex.raw('COUNT(players.id)::INT as "registeredPlayers"'));

  if (year && month) {
    query.joinRaw(`LEFT JOIN players ON players."affiliateId" = affiliates.id AND players."registrationDate" >= '${DateTime.local(year, month, 1).toISO()}' AND players."registrationDate" < '${DateTime.local(year, month, 1).plus({ month: 1 }).toISO()}'`);
  } else {
    query.joinRaw('LEFT JOIN players ON players."affiliateId" = affiliates.id');
  }

  query.groupBy('affiliates.id');

  return query;
};

const getAffiliatePlayersCount = (knex: Knex, affiliateId: Id, year?: number, month?: number): Knex$QueryBuilder<{ affiliateId: Id, registeredPlayers: number, }> => {
  const query = knex('affiliates')
    .select('affiliates.id',
      knex.raw('COALESCE("registeredPlayers"."registeredPlayers", 0)::INT AS "registeredPlayers"'))
    .leftJoin(getAffiliatesPlayersCount(knex, year, month).as('registeredPlayers'), 'registeredPlayers.affiliateId', 'affiliates.id')
    .where({ 'affiliates.id': affiliateId })
    .first();

  return query;
};

const updateAffiliatePlayersPlan = async (knex: Knex, affiliateId: Id, planId: Id): Promise<Player[]> => {
  const players = await knex('players')
    .update({ planId })
    .where({ affiliateId })
    .returning('*');

  return players;
};

const getAffiliatesPlayerActivities = (knex: Knex, year: number, month: number): Knex$QueryBuilder<{ affiliateId: Id, netRevenue: Money, deposits: Money, commission: Money, cpa: Money, activePlayers: number, }[]> => {
  const query = knex('activities')
    .select('players.affiliateId',
      knex.raw('SUM(activities."netRevenue") AS "netRevenue"'),
      knex.raw('SUM(activities."deposits") AS "deposits"'),
      knex.raw(`json_build_object(
        ${affmoreBrands.map(b => `'${b.id}',COALESCE(SUM(activities."commission") FILTER (WHERE players."brandId" = '${b.id}'), 0)`).join(',')}
        ) as commissions`),
      knex.raw('SUM(activities."commission") AS "commission"'),
      knex.raw('SUM(activities."cpa") AS "cpa"'),
      knex.raw('COUNT(DISTINCT activities."playerId") as "activePlayers"'))
    .leftJoin('players', 'players.id', 'activities.playerId')
    .where('activities.activityDate', '>=', DateTime.local(year, month, 1))
    .where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }))
    .groupBy('players.affiliateId');

  return query;
};

const getAffiliatesDepositingPlayersCount = (knex: Knex, year: number, month: number, newDeposits: boolean = false): Knex$QueryBuilder<{ affiliateId: Id, depositingPlayers: number}[]> => {
  const query = knex('affiliates')
    .select('affiliates.id as affiliateId', knex.raw('COUNT(DISTINCT(players.id))::INT as "depositingPlayers"'))
    .leftJoin('players', 'players.affiliateId', 'affiliates.id')
    .leftJoin('activities', 'activities.playerId', 'players.id')
    .where('activities.activityDate', '>=', DateTime.local(year, month, 1))
    .where('activities.activityDate', '<', DateTime.local(year, month, 1).plus({ month: 1 }))
    .where('activities.deposits', '>', 0);

  if (newDeposits) {
    query.whereNotExists(knex.select('id').from('activities')
      .whereRaw('"playerId" = players.id')
      .where('activityDate', '<', DateTime.local(year, month, 1))
      .where('deposits', '>', 0));
  }

  query.groupBy('affiliates.id');

  return query;
};

const getAffiliatesDepositingPlayersCountGroupedByDate = (knex: Knex, newDeposits: boolean = false): Knex$QueryBuilder<{ affiliateId: Id, date: string, depositingPlayers: number, }[]> => {
  const query = knex('affiliates')
    .select('affiliates.id as affiliateId', 'activities.activityDate as date', knex.raw('COUNT(DISTINCT(players.id))::INT as "depositingPlayers"'))
    .leftJoin('players', 'players.affiliateId', 'affiliates.id')
    .leftJoin('activities', 'activities.playerId', 'players.id')
    .where('activities.deposits', '>', 0);

  if (newDeposits) {
    query.whereNotExists(knex.select('id').from('activities as previousActivities')
      .whereRaw('"previousActivities"."playerId" = players.id')
      .whereRaw('"previousActivities"."activityDate" < activities."activityDate"')
      .where('previousActivities.deposits', '>', 0));
  }

  query.groupByRaw('affiliates.id, activities."activityDate"');

  return query;
};

const getAffiliateDepositingPlayersCount = (knex: Knex, affiliateId: Id, year: number, month: number, newDeposits: boolean = false): Knex$QueryBuilder<{ affiliateId: Id, depositingPlayers: number, }> => {
  const query = knex('affiliates')
    .select('affiliates.id',
      knex.raw('COALESCE("depositingPlayers"."depositingPlayers", 0)::INT AS "depositingPlayers"'))
    .leftJoin(getAffiliatesDepositingPlayersCount(knex, year, month, newDeposits).as('depositingPlayers'), 'depositingPlayers.affiliateId', 'affiliates.id')
    .where({ 'affiliates.id': affiliateId })
    .first();

  return query;
};

const getActivePlayers = async (knex: Knex, affiliateId: Id, year: number, month: number): Promise<PlayerWithInfo[]> => {
  const players = await knex('players')
    .select('players.id', 'players.affiliateId', 'players.planId', 'players.linkId', 'players.clickId', 'players.brandId', 'players.countryId', 'players.registrationDate', 'plans.name as deal', 'links.name as link')
    .leftJoin('plans', 'plans.id', 'players.planId')
    .leftJoin('links', 'links.id', 'players.linkId')
    .leftJoin('activities', 'activities.playerId', 'players.id')
    .where('activities.activityDate', '>=', DateTime.local(year, month))
    .where('activities.activityDate', '<', DateTime.local(year, month).plus({ month: 1 }))
    .where({ 'players.affiliateId': affiliateId })
    .distinct()
    .orderBy('players.id');

  return players;
};

const upsertPlayerRegistration = async (knex: Knex, playerDraft: PlayerInsertDraft): Promise<Player> => {
  const player = await upsert2(knex, 'players', playerDraft, ['id']);
  return player;
};

const upsertPlayerActivity = async (knex: Knex, activityDraft: Partial<ActivityDraft>): Promise<Activity> => {
  const activity = await upsert2(knex, 'activities', activityDraft, ['playerId', 'activityDate']);
  return activity;
};

module.exports = {
  getPlayer,
  getPlayerById,
  updatePlayer,
  getPlayerActivities,
  getAffiliatePlayers,

  getActiveAffiliatePlayers,
  getAffiliatesPlayersCount,
  getAffiliatePlayersCount,
  updateAffiliatePlayersPlan,

  getAffiliatesPlayerActivities,
  getAffiliatesDepositingPlayersCount,
  getAffiliatesDepositingPlayersCountGroupedByDate,
  getAffiliateDepositingPlayersCount,

  getActivePlayers,

  upsertPlayerRegistration,
  upsertPlayerActivity,
};
