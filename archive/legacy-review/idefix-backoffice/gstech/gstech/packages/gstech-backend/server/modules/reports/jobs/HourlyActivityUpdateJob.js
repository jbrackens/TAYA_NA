/* @flow */
const pg = require('gstech-core/modules/pg');
const { hourStart, hourEnd } = require('./reporting-time');

const update = async (hour: Date) => {
  const query = `
    INSERT INTO report_hourly_players ("amount", "bonusAmount", "playerId", "type", "count", "hour")
      SELECT
        sum(amount) AS "amount",
        sum("bonusAmount") as "bonusAmount",
        "playerId",
        "type",
        count(*) AS "count",
        date_trunc('hour', '${hourStart(hour)}'::timestamp) AS "hour"
      FROM transactions
      WHERE "timestamp" BETWEEN '${hourStart(hour)}' and '${hourEnd(hour)}'
      GROUP BY "playerId", "type"
  `;
  await pg.transaction(async (tx) => {
    await tx.raw(`delete from report_hourly_players where hour=date_trunc('hour', '${hourStart(hour)}'::timestamp)`);
    await tx.raw(query);
  });
};

module.exports = { update };
