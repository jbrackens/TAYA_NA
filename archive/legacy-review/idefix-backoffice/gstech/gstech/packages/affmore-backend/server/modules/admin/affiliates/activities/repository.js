// @flow
import type { DateTime } from 'luxon';
import type { ActivityReport } from '../../../../../types/repository/activities';

// const { DateTime } = require('luxon');

const getAffiliateActivities = async (knex: Knex, affiliateId: Id, from: DateTime, to: DateTime, brandId?: BrandId): Promise<ActivityReport[]> => {
  const fromDate = from.toString();
  const toDate = to.plus({ day: 1 }).toString();

  const query = knex.raw(`WITH
    "newDepositingPlayers" AS (
        SELECT
          players."linkId",
          players."brandId",
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
          AND "activityDate" >= :fromDate AND "activityDate" < :toDate AND players."affiliateId"=:affiliateId
        GROUP BY players."linkId", players."brandId", coalesce("clicks"."segment", '')
    ),
    activity AS (
        SELECT
            players."linkId",
            players."brandId",
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
            sum("cpa") AS "cpa"
        FROM activities
            LEFT JOIN players ON players.id=activities."playerId"
            LEFT JOIN clicks ON players."clickId"=clicks.id
        WHERE
            "activityDate" >= :fromDate AND "activityDate" < :toDate AND players."affiliateId"=:affiliateId
        GROUP BY players."linkId", players."brandId", coalesce("clicks"."segment", '')
    ),
    click AS (
        SELECT
            "linkId",
            links."brandId",
            count(clicks.id)::INT AS clicks,
            coalesce("clicks"."segment", '') AS segment
        FROM clicks
            JOIN links ON clicks."linkId"=links.id
        WHERE
          "clickDate" >= :fromDate AND "clickDate" < :toDate AND links."affiliateId"=:affiliateId
        GROUP BY "linkId", links."brandId", coalesce("clicks"."segment", '')
    ),
    "newRegisteredPlayers" AS (
        SELECT
            players."brandId",
            coalesce("clicks"."segment", '') AS segment,
            count(*)::INT AS "nrc",
            players."linkId"
        FROM players
            LEFT JOIN clicks ON players."clickId"=clicks.id
        WHERE
            "registrationDate" >= :fromDate AND "registrationDate" < :toDate AND players."affiliateId"=:affiliateId
        GROUP BY players."linkId", players."brandId", coalesce("clicks"."segment", '')
    ),
    segments AS (
        SELECT DISTINCT
            "linkId",
            links."brandId",
            coalesce("clicks"."segment", '') AS segment
        FROM links
        LEFT JOIN clicks ON clicks."linkId"=links.id
        WHERE "clickDate" >= :fromDate AND "clickDate" < :toDate AND "affiliateId"=:affiliateId
        GROUP BY "linkId", links."brandId", coalesce("clicks"."segment", '')
    )
    SELECT
    "links"."name" AS "link",
    "links"."id" AS "linkId",
    "links"."brandId",
    segments.segment,
    coalesce("newRegisteredPlayers".nrc, 0) AS nrc,
    coalesce("newDepositingPlayers".ndc, 0) AS ndc,
    coalesce(activity."deposits", 0) AS "deposits",
    coalesce(activity."turnover", 0) AS "turnover",
    coalesce(activity."grossRevenue", 0) AS "grossRevenue",
    coalesce(activity."bonuses", 0) AS "bonuses",
    coalesce(activity."adjustments", 0) AS "adjustments",
    coalesce(activity."fees", 0) AS "fees",
    coalesce(activity."tax", 0) AS "tax",
    coalesce(activity."netRevenue", 0) AS "netRevenue",
    coalesce(activity."commission", 0) AS "commission",
    coalesce(activity."cpa", 0) AS "cpa",
    coalesce(click.clicks, 0) as clicks
    FROM segments
    JOIN links ON segments."linkId"=links.id
    LEFT JOIN click ON segments."linkId" = click."linkId" AND segments.segment=click.segment AND segments."brandId" = click."brandId"
    LEFT JOIN activity ON segments."linkId" = activity."linkId" AND segments.segment=activity.segment AND segments."brandId" = activity."brandId"
    LEFT JOIN "newRegisteredPlayers" ON segments."linkId" = "newRegisteredPlayers"."linkId" AND segments.segment="newRegisteredPlayers".segment AND segments."brandId" = "newRegisteredPlayers"."brandId"
    LEFT JOIN "newDepositingPlayers" ON segments."linkId" = "newDepositingPlayers"."linkId" AND segments.segment="newDepositingPlayers".segment AND segments."brandId" = "newDepositingPlayers"."brandId"
    WHERE
    "links"."affiliateId" = :affiliateId
    AND (clicks is not null OR "newRegisteredPlayers"."linkId" IS NOT NULL OR "newDepositingPlayers"."linkId" IS NOT NULL OR activity."linkId" IS NOT null)
    ${brandId ? 'AND links."brandId" = :brandId' : ''}
    ORDER BY
    links."brandId", links.name, segments.segment`, {
      affiliateId,
      fromDate,
      toDate,
      brandId,
    });

  const { rows } = await query;
  return rows;
};

module.exports = {
  getAffiliateActivities,
};
