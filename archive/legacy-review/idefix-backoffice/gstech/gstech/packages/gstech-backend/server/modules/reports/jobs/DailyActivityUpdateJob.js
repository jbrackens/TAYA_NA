/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const update = async (hour: Date) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  const query = `
    INSERT INTO report_daily_brands ("amount", "bonusAmount", "currencyId", "type", "brandId", "count", "day")
      SELECT
        sum(amount) as "amount",
        sum("bonusAmount") as "bonusAmount",
        "currencyId",
        "type",
        "brandId",
        count("transactions"."id") as "count",
        date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') as "day"
      FROM transactions
      JOIN players ON "players"."id" = "transactions"."playerId"
      WHERE "transactions"."timestamp"
        between '${moment(hour).startOf('day').format('YYYY-MM-DDTHH:mm:ss.000000Z')}'
        and '${moment(hour).endOf('day').format('YYYY-MM-DDTHH:mm:ss.999999Z')}'
      AND "testPlayer"=false
      GROUP BY "brandId", "currencyId", "type"
  `;
  await pg.transaction(async (tx) => {
    await tx.raw(`delete from report_daily_brands where day = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')`);
    await tx.raw(query);
  });
};

module.exports = { update };
