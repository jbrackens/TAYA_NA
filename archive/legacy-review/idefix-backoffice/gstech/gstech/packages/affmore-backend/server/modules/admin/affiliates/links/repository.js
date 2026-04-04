// @flow
import type { DateTime } from 'luxon';
import type { LinkDraft, Link, LinkWithDetails, ClickDraft, Click, ClickWithStatistics } from '../../../../../types/repository/links';

const logger = require('gstech-core/modules/logger');
const { v1: uuid } = require('uuid');

const generateUuid = () => uuid().replace(/-/g, '').toUpperCase();

const getAffiliateLinks = (knex: Knex, affiliateId: Id, brandId?: BrandId): Knex$QueryBuilder<LinkWithDetails[]> =>
  knex('links')
    .select('links.id', 'links.affiliateId', 'links.planId', 'links.brandId', 'links.code', 'links.name', 'links.landingPage', 'plans.name as deal')
    .leftJoin('plans', 'plans.id', 'links.planId')
    .where({ 'links.affiliateId': affiliateId })
    .where((qb: Knex$QueryBuilder<any>): Knex$QueryBuilder<any> => {
      if (brandId) {
        qb.where({ brandId });
      }

      return qb;
    })
    .orderBy('links.id');

const getAffiliateLink = async (knex: Knex, affiliateId: Id, linkId: Id): Promise<LinkWithDetails> => {
  const [link] = await knex('links')
    .select('links.id', 'links.affiliateId', 'links.planId', 'links.brandId', 'links.code', 'links.name', 'links.landingPage', 'plans.name as deal')
    .leftJoin('plans', 'plans.id', 'links.planId')
    .where({ 'links.affiliateId': affiliateId })
    .where({ 'links.id': linkId })
    .orderBy('links.id');

  return link;
};

const getAffiliateLinkById = async (knex: Knex, linkId: Id): Promise<?LinkWithDetails> => {
  const [link] = await knex('links')
    .select('links.id', 'links.affiliateId', 'links.planId', 'links.brandId', 'links.code', 'links.name', 'links.landingPage', 'plans.name as deal')
    .leftJoin('plans', 'plans.id', 'links.planId')
    .where({ 'links.id': linkId })
    .orderBy('links.id');

  return link;
};

const getAffiliateLinkByCode = async (knex: Knex, code: string): Promise<?LinkWithDetails> => {
  const [link] = await knex('links')
    .select('links.id', 'links.affiliateId', 'links.planId', 'links.brandId', 'links.code', 'links.name', 'links.landingPage', 'plans.name as deal')
    .leftJoin('plans', 'plans.id', 'links.planId')
    .where({ 'links.code': code });

  return link;
};

const createAffiliateLink = async (knex: Knex, linkDraft: LinkDraft, affiliateId: Id): Promise<Link> => {
  const code = generateUuid();
  const [link] = await knex('links')
    .insert({ affiliateId, code, ...linkDraft })
    .returning('*');

  return link;
};

const updateAffiliateLink = async (knex: Knex, linkId: Id, linkDraft: LinkDraft): Promise<Link> => {
  const [link] = await knex('links')
    .update(linkDraft)
    .where({ id: linkId })
    .returning('*');

  return link;
};

const deleteAffiliateLink = async (knex: Knex, linkId: Id): Promise<number> => {
  const count = await knex('links')
    .delete()
    .where({ id: linkId });

  return count;
};

const getAffiliateLinkClicksWithStatistics = async (knex: Knex, affiliateId: Id, linkId: Id, { from, to }: { from: DateTime, to: DateTime }): Promise<ClickWithStatistics[]> => {
  const fromDate = from.toString();
  const toDate = to.plus({ day: 1 }).toString();

  const query = knex.raw(`WITH
  "newDepositingPlayers" AS (
      SELECT
        "activityDate" AS date,
        coalesce("clicks"."segment", '') AS segment,
        count(distinct(players.id))::INT AS "ndc"
      FROM
        players
        LEFT JOIN activities ON activities."playerId"=players.id
        LEFT JOIN clicks ON players."clickId"=clicks.id
      WHERE
        activities.deposits > 0
        AND NOT EXISTS
        (
            SELECT id
            FROM
              activities AS "previousActivities"
            WHERE
              "previousActivities"."playerId" = players.id
              AND "previousActivities"."activityDate" < activities."activityDate"
              AND "previousActivities".deposits > 0
        )
        AND "activityDate" >= :fromDate AND "activityDate" < :toDate AND players."affiliateId"=:affiliateId and players."linkId"=:linkId
      GROUP BY "activityDate", coalesce("clicks"."segment", '')
  ),
  activity AS (
      SELECT
          "activityDate" AS date,
          coalesce("clicks"."segment", '') AS segment,
          sum("deposits") AS "deposits",
          sum("turnover") AS "turnover",
          sum("grossRevenue") AS "grossRevenue",
          sum("bonuses") AS "bonuses",
          sum("adjustments") AS "adjustments",
          sum("fees") AS "fees",
          sum("tax") AS "tax",
          sum("netRevenue") AS "netRevenue",
          sum("commission") AS "commission",
          sum("cpa") AS "cpa",
          count(CASE WHEN "cpa" > 0 THEN 1 END)::INT AS "cpaCount"
      FROM activities
          LEFT JOIN players ON players.id=activities."playerId"
          LEFT JOIN clicks ON players."clickId"=clicks.id AND activities."activityDate"::DATE = clicks."clickDate"::DATE
      WHERE
          "activityDate" >= :fromDate AND "activityDate" < :toDate AND players."affiliateId"=:affiliateId and players."linkId"=:linkId
      GROUP BY "activityDate", coalesce("clicks"."segment", '')
  ),
  click AS (
      SELECT
          "clickDate"::DATE AS date,
          coalesce("clicks"."segment", '') AS segment,
          count(clicks.id)::INT AS clicks
      FROM clicks
          JOIN links ON clicks."linkId"=links.id
      WHERE
        "clickDate" >= :fromDate AND "clickDate" < :toDate AND links."affiliateId"=:affiliateId and links.id=:linkId
      GROUP BY "clickDate"::DATE, coalesce("clicks"."segment", '')
  ),
  "newRegisteredPlayers" AS (
      SELECT
          "registrationDate"::DATE AS "date",
          coalesce("clicks"."segment", '') AS segment,
          count(*)::INT AS "nrc"
      FROM players
          LEFT JOIN clicks ON players."clickId"=clicks.id
      WHERE
          "registrationDate" >= :fromDate AND "registrationDate" < :toDate AND players."affiliateId"=:affiliateId and players."linkId"=:linkId
      GROUP BY "registrationDate"::DATE, coalesce("clicks"."segment", '')
  ),
  days AS (
    SELECT distinct(d."date"::DATE) AS "date", "segment" FROM (
    SELECT "date", "segment" FROM click
    UNION ALL
    SELECT "date", "segment" FROM activity
    UNION ALL
    SELECT "date", "segment" FROM "newRegisteredPlayers"
    UNION ALL
    SELECT "date", "segment" FROM "newDepositingPlayers"
    ) d
  )
  SELECT
  days.date::DATE AS "clickDate",
  days.segment as "segment",
  coalesce(sum(click.clicks)::INT, 0) AS clicks,
  coalesce(sum("newRegisteredPlayers".nrc), 0)::INT AS "nrc",
  coalesce(sum("newDepositingPlayers".ndc), 0)::INT AS "ndc",
  coalesce(sum("deposits"), 0) AS "deposits",
  coalesce(sum("turnover"), 0) AS "turnover",
  coalesce(sum("grossRevenue"), 0) AS "grossRevenue",
  coalesce(sum("bonuses"), 0) AS "bonuses",
  coalesce(sum("adjustments"), 0) AS "adjustments",
  coalesce(sum("fees"), 0) AS "fees",
  coalesce(sum("tax"), 0) AS "tax",
  coalesce(sum("netRevenue"), 0) AS "netRevenue",
  coalesce(sum("commission"), 0) AS "commission",
  coalesce(sum("cpa"), 0) AS "cpa",
  sum(coalesce("cpaCount", 0))::INT as "cpaCount"
  FROM days
  LEFT JOIN click ON days.date = click.date AND days.segment = click.segment
  LEFT JOIN activity ON activity.date = days.date AND days.segment = activity.segment
  LEFT JOIN "newRegisteredPlayers" ON "newRegisteredPlayers".date = days.date AND days.segment = "newRegisteredPlayers".segment
  LEFT JOIN "newDepositingPlayers" ON "newDepositingPlayers".date = days.date AND days.segment = "newDepositingPlayers".segment
  GROUP BY days.date, days.segment
  ORDER BY
  days.date`, {
      affiliateId,
      linkId,
      fromDate,
      toDate,
    });
  logger.debug('getAffiliateLinkClicksWithStatistics', query.toString());
  const { rows } = await query;
  return rows;
};

const createClick = async (knex: Knex, clickDraft: ClickDraft): Promise<Click> => {
  const [click] = await knex('clicks')
    .insert(clickDraft)
    .returning('*');

  return click;
};

const getClicks = async (knex: Knex, linkId: Id): Promise<Click[]> => {
  const clicks = await knex('clicks')
    .select('id', 'linkId', 'clickDate', 'referralId', 'segment', 'queryParameters', 'ipAddress', 'userAgent', 'referer')
    .where({ linkId });

  return clicks;
};

const getClickById = async (knex: Knex, clickId: Id): Promise<?Click> => {
  const click = await knex('clicks')
    .first('id', 'linkId', 'clickDate', 'referralId', 'segment', 'queryParameters', 'ipAddress', 'userAgent', 'referer')
    .where({ id: clickId });

  return click;
};

module.exports = {
  getAffiliateLinks,
  getAffiliateLink,
  getAffiliateLinkById,
  getAffiliateLinkByCode,
  getAffiliateLinkClicksWithStatistics,
  createAffiliateLink,
  updateAffiliateLink,
  deleteAffiliateLink,

  createClick,
  getClicks,
  getClickById,
};
