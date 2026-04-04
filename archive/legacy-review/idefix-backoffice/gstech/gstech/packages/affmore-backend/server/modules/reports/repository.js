// @flow
import type { DateTime } from 'luxon';
import type { ClickWithStatistics } from '../../../types/repository/links';

const logger = require('gstech-core/modules/logger');

const { getAffiliatesDepositingPlayersCountGroupedByDate } = require('../admin/affiliates/players/repository');

// TODO: knex type in any because this certain function hangs flow type check.
const getCombinedReport = async (knex: any, affiliateId: Id, linkId: Id, { brandId, from, to }: { brandId: BrandId, from: DateTime, to: DateTime }): Promise<ClickWithStatistics[]> => {
  const fromDate = from.toString();
  const toDate = to.plus({ day: 1 }).toString();
  const query = knex
  .with('newDepositingPlayers',
    getAffiliatesDepositingPlayersCountGroupedByDate(knex, true)
    .where({ linkId, brandId, affiliateId })
    .where('activityDate', '>=', fromDate)
    .where('activityDate', '<', toDate)
  )
  .with('activity',
    knex.select(
      knex.raw('"activityDate" AS "date"'),
      knex.raw('sum("deposits") AS "deposits"'),
      knex.raw('sum("turnover") AS "turnover"'),
      knex.raw('sum("grossRevenue") AS "grossRevenue"'),
      knex.raw('sum("bonuses") AS "bonuses"'),
      knex.raw('sum("adjustments") AS "adjustments"'),
      knex.raw('sum("fees") AS "fees"'),
      knex.raw('sum("tax") AS "tax"'),
      knex.raw('sum("netRevenue") AS "netRevenue"'),
      knex.raw('sum("commission") AS "commission"'),
      knex.raw('sum("cpa") AS "cpa"'),
      knex.raw('count(CASE WHEN "cpa" > 0 THEN 1 END)::INT AS "cpaCount"'),
    )
    .from('activities')
    .innerJoin('players', 'players.id', 'activities.playerId')
    .leftJoin('clicks', 'clicks.id', 'players.clickId')
    .where({
      'players.linkId': linkId,
      'players.brandId': brandId,
      'players.affiliateId': affiliateId,
    })
    .where('activityDate', '>=', fromDate)
    .where('activityDate', '<', toDate)
    .groupBy('activityDate')
  )
  .with('click', knex.select(
      knex.raw('"clickDate"::DATE AS date'),
      knex.raw('count(clicks.id)::INT AS clicks'),
    ).from('clicks')
    .innerJoin('links', 'clicks.linkId', 'links.id')
    .where({
      'links.id': linkId,
      'links.affiliateId': affiliateId,
      'links.brandId': brandId,
    })
    .where('clickDate', '>=', fromDate)
    .where('clickDate', '<', toDate)
    .groupByRaw('"clickDate"::DATE')
  )
  .with('newRegisteredPlayers',
    knex.select(
      knex.raw('count(*)::INT AS "nrc"'),
      knex.raw('"registrationDate"::DATE AS "date"'),
    )
    .from('players')
    .leftJoin('clicks', 'players.clickId', 'clicks.id')
    .where({
      'players.affiliateId': affiliateId,
      'players.linkId': linkId,
      'players.brandId': brandId
    })
    .where('registrationDate', '>=', fromDate)
    .where('registrationDate', '<', toDate)
    .groupByRaw('"registrationDate"::DATE')
  )
  .with('days', knex
    .select(knex.raw('distinct(d."date"::DATE) AS "date"'))
    .from(
      knex('click')
        .select('date')
        .unionAll([
          knex('activity').select('date'),
          knex('newRegisteredPlayers').select('date'),
          knex('newDepositingPlayers').select('date'),
        ])
        .as('d')
      )
    )
    .select(
      knex.raw('days.date::DATE as "clickDate"'),
      knex.raw('coalesce(sum(click.clicks)::INT, 0) AS clicks'),
      knex.raw('coalesce(sum("newRegisteredPlayers".nrc), 0)::INT AS "nrc"'),
      knex.raw('coalesce(sum("newDepositingPlayers"."depositingPlayers"), 0)::INT AS "ndc"'),
      knex.raw('coalesce(sum("deposits"), 0) AS "deposits"'),
      knex.raw('coalesce(sum("turnover"), 0) AS "turnover"'),
      knex.raw('coalesce(sum("grossRevenue"), 0) AS "grossRevenue"'),
      knex.raw('coalesce(sum("bonuses"), 0) AS "bonuses"'),
      knex.raw('coalesce(sum("adjustments"), 0) AS "adjustments"'),
      knex.raw('coalesce(sum("fees"), 0) AS "fees"'),
      knex.raw('coalesce(sum("tax"), 0) AS "tax"'),
      knex.raw('coalesce(sum("netRevenue"), 0) AS "netRevenue"'),
      knex.raw('coalesce(sum("commission"), 0) AS "commission"'),
      knex.raw('coalesce(sum("cpa"), 0) AS "cpa"'),
      knex.raw('sum(coalesce("cpaCount", 0))::INT AS "cpaCount"'),
    )
    .from('days')
    .leftJoin('click', 'days.date', 'click.date')
    .leftJoin('activity', 'days.date', 'activity.date')
    .leftJoin('newRegisteredPlayers', 'days.date', 'newRegisteredPlayers.date')
    .leftJoin('newDepositingPlayers', 'days.date', 'newDepositingPlayers.date')
    .groupBy('days.date')
    .orderBy('days.date');

  logger.debug('getCombinedReport', query.toString());
  const result = await query;
  return result;
};

const getCombinedSegmentsReport = async (knex: Knex, affiliateId: Id, linkId: Id, { brandId, from, to }: { brandId: BrandId, from: DateTime, to: DateTime }): Promise<{ segment: string, ...ClickWithStatistics }[]> => { // The return type is not correct. reality misses activityDate
  const fromDate = from.toString();
  const toDate = to.plus({ day: 1 }).toString();

  const query = knex.raw(`WITH
    "newDepositingPlayers" AS (
        SELECT
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
          AND "activityDate" >= :fromDate
          AND "activityDate" < :toDate
          AND players."affiliateId"=:affiliateId
          AND players."linkId"=:linkId
          AND players."brandId"=:brandId
        GROUP BY coalesce("clicks"."segment", '')
    ),
    activity AS (
        SELECT
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
            LEFT JOIN clicks ON players."clickId"=clicks.id
        WHERE
            "activityDate" >= :fromDate AND
            "activityDate" < :toDate AND
            players."affiliateId"=:affiliateId AND
            players."linkId"=:linkId AND
            players."brandId"=:brandId
        GROUP BY coalesce("clicks"."segment", '')
    ),
    click AS (
        SELECT
            count(clicks.id)::INT AS clicks,
            coalesce("clicks"."segment", '') AS segment
        FROM clicks
            JOIN links ON clicks."linkId"=links.id
        WHERE
          "clickDate" >= :fromDate AND
          "clickDate" < :toDate AND
          links."affiliateId"=:affiliateId AND
          links."brandId"=:brandId AND
          links.id=:linkId
        GROUP BY coalesce("clicks"."segment", '')
    ),
    "newRegisteredPlayers" AS (
        SELECT
            coalesce("clicks"."segment", '') AS segment,
            count(*)::INT AS "nrc"
        FROM players
            LEFT JOIN clicks ON players."clickId"=clicks.id
        WHERE
            "registrationDate" >= :fromDate AND
            "registrationDate" < :toDate AND
            players."affiliateId"=:affiliateId AND
            players."linkId"=:linkId AND
            players."brandId"=:brandId
        GROUP BY coalesce("clicks"."segment", '')
    ),
    segments AS (
        SELECT DISTINCT
        links.id as "linkId",
        coalesce("clicks"."segment", '') AS segment
        FROM links
        LEFT JOIN clicks ON clicks."linkId"=links.id
        WHERE
          "affiliateId"=:affiliateId AND
          links.id=:linkId AND
          links."brandId"=:brandId
        GROUP BY links.id, coalesce("clicks"."segment", '')
    )
    SELECT
      segments.segment,
      links.code,
      links.name,
      coalesce(sum("newRegisteredPlayers".nrc), 0)::INT AS nrc,
      coalesce(sum("newDepositingPlayers".ndc), 0)::INT AS ndc,
      coalesce(sum(activity."deposits"), 0) AS "deposits",
      coalesce(sum(activity."turnover"), 0) AS "turnover",
      coalesce(sum(activity."grossRevenue"), 0) AS "grossRevenue",
      coalesce(sum(activity."bonuses"), 0) AS "bonuses",
      coalesce(sum(activity."adjustments"), 0) AS "adjustments",
      coalesce(sum(activity."fees"), 0) AS "fees",
      coalesce(sum(activity."tax"), 0) AS "tax",
      coalesce(sum(activity."netRevenue"), 0) AS "netRevenue",
      coalesce(sum(activity."commission"), 0) AS "commission",
      coalesce(sum(activity."cpa"), 0) AS "cpa",
      sum(coalesce(activity."cpaCount", 0))::INT AS "cpaCount",
      coalesce(sum(click.clicks), 0)::INT as clicks
    FROM links
    LEFT JOIN segments ON segments."linkId"=links.id
    LEFT JOIN click ON segments.segment = click.segment
    LEFT JOIN activity ON segments.segment=activity.segment
    LEFT JOIN "newRegisteredPlayers" ON segments.segment="newRegisteredPlayers".segment
    LEFT JOIN "newDepositingPlayers" ON segments.segment="newDepositingPlayers".segment
    WHERE
      links."affiliateId" = :affiliateId AND
      links."brandId"=:brandId
      AND links.id=:linkId
      AND (clicks is not null OR "newRegisteredPlayers"."segment" IS NOT NULL OR "newDepositingPlayers"."segment" IS NOT NULL OR activity."segment" IS NOT null)
    GROUP BY segments.segment, links.code, links.name
    ORDER BY links.name, segments.segment`, {
      affiliateId,
      linkId,
      fromDate,
      toDate,
      brandId,
    })
    .debug();
  const { rows } = await query;
  return rows;
};

module.exports = {
  getCombinedReport,
  getCombinedSegmentsReport,
};
