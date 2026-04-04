/* @flow */
 
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { settings } = require('../../settings');

const updateBrand = async (hour: Date, brandId: string) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  const query = `with last_transactions as (
    SELECT * from (
        SELECT
          "id",
          "playerId",
          "reservedBalance",
          "balance",
          "bonusBalance",
          row_number() over (partition by transactions."playerId" order by "timestamp" desc, "id" desc) r
        FROM transactions
        WHERE
          transactions.timestamp BETWEEN
          date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') - interval '1 month'
        AND date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') - interval '1 usec'
    ) tx WHERE tx.r=1
  ) INSERT INTO account_statements ("playerId", "month", "reservedBalance", "balance", "bonusBalance")
    SELECT * FROM (SELECT DISTINCT ON ("players"."id")
        "players"."id" AS "playerId",
        date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') AS month,
        coalesce("transactions"."reservedBalance", min(p."reservedBalance"), 0) AS "reservedBalance",
        coalesce("transactions"."balance", min(p."balance"), 0) AS "balance",
        coalesce("transactions"."bonusBalance", min(p."bonusBalance"), 0) AS "bonusBalance"
      FROM players
      LEFT OUTER JOIN last_transactions as transactions ON "transactions"."playerId" = "players"."id"
      LEFT OUTER JOIN account_statements p
        ON p."playerId" = "players"."id"
        AND p."month" = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')- interval'1 month'
      WHERE "testPlayer" = false AND players."brandId"=?
      GROUP BY "players"."id", "transactions"."id", "transactions"."balance", "transactions"."bonusBalance", "transactions"."reservedBalance"
      ORDER BY "players"."id", "transactions"."id" DESC
    ) r WHERE r.balance > 0 OR r."bonusBalance" > 0 OR r."reservedBalance" > 0`;
  await pg.raw(query, brandId);
};

const update = async (hour: Date) => {
  for (const brand of settings().brands) {
    await updateBrand(hour, brand.id);
  }
};

module.exports = { update };
