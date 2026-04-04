/* @flow */
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addPlayerFraud } = require('../../frauds');

const limit = promiseLimit(4);

/* eslint-disable no-useless-escape */ // for hstore '?' operator
const update = async () => {
  logger.debug('lifetime deposit fraud trigger job: started...');

  const {
    rows: players,
  }: {
    rows: Array<{
      fraudPlayerId: Id,
      sowAnswers: { industry: String, salary: String, explanation?: String },
    }>,
  } = await pg.raw(`
      WITH expired AS (
          SELECT "playerId"
          FROM "player_frauds"
          WHERE
              "fraudKey" = 'lifetime_deposit'
              AND ("player_frauds"."details" ->> 'total')::int BETWEEN 10000000 AND 12500000
              AND "player_frauds"."createdAt" + '30 days'::interval < now()
      ),
      crossBrandInfo AS (
          SELECT
              expired."playerId" AS "fraudPlayerId",
              json_agg(t."details") FILTER (WHERE t."details" IS NOT NULL) AS "sowAnswers",
              json_agg(akeys(pp."tags")) FILTER (WHERE pp."tags" \\\? 'fail-sow' OR pp."tags" \\\? 'pass-sow') AS "sowTags"
          FROM expired
          CROSS JOIN LATERAL (
              SELECT DISTINCT "id" AS "playerIds", "tags" FROM "players"
              WHERE "personId" = (SELECT "personId" FROM "players" WHERE "id" = expired."playerId")
              OR ("id" = expired."playerId")
          ) pp
          LEFT JOIN LATERAL (
            SELECT pf."details"
            FROM "player_frauds" pf
            WHERE pf."fraudKey" = 'lifetime_deposit_75k'
            AND pf."playerId" = pp."playerIds"
            LIMIT 1
          ) t ON TRUE
          group by expired."playerId"
      )
      SELECT
        "fraudPlayerId",
        json_array_elements("sowAnswers") AS "sowAnswers"
      FROM crossBrandInfo
      WHERE crossBrandInfo."sowTags" IS NULL;
  `);

  await Promise.all(
    players.map(({ fraudPlayerId, sowAnswers }) =>
      limit(() => addPlayerFraud(fraudPlayerId, 'lifetime_deposit_100k_30day', '', sowAnswers)),
    ),
  );

  logger.debug('lifetime deposit fraud trigger job: completed.', { players });
};

module.exports = { update };
