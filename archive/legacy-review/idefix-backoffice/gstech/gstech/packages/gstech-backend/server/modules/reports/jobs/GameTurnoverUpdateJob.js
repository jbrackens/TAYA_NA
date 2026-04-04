/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const update = async (hour: Date) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  const query = `
    INSERT INTO report_daily_games_brands ("amount", "bonusAmount", "currencyId", "type", "brandId", "gameId", "manufacturerId", "count", "day")
      SELECT
        sum(amount) as "amount",
        sum("bonusAmount") as "bonusAmount",
        "currencyId",
        "type",
        "brandId",
        coalesce("game_rounds"."gameId", 100) as "gameId",
        coalesce("game_rounds"."manufacturerId", 'INT') as "manufacturerId",
        count("transactions"."id") as "count",
        date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') as "day"
      FROM transactions
      JOIN players ON "players"."id" = "transactions"."playerId"
      LEFT OUTER JOIN game_rounds ON transactions."gameRoundId"=game_rounds.id and "game_rounds"."timestamp" between '${moment(hour).startOf('day').add(-2, 'month').format('YYYY-MM-DDTHH:mm:ss.000000Z')}' and '${moment(hour).endOf('day').add(1, 'month').format('YYYY-MM-DDTHH:mm:ss.999999Z')}'
      WHERE
        type in ('bet', 'win', 'cancel_bet', 'cancel_win', 'win_freespins', 'win_jackpot', 'win_local_jackpot')
        AND "transactions"."timestamp" between '${moment(hour).startOf('day').format('YYYY-MM-DDTHH:mm:ss.000000Z')}' and '${moment(hour).endOf('day').format('YYYY-MM-DDTHH:mm:ss.999999Z')}'
      GROUP BY "game_rounds"."gameId", "game_rounds"."manufacturerId", "brandId", "currencyId", "type"
  `;
  await pg.transaction(async (tx) => {
    await tx.raw(`delete from report_daily_games_brands where day = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')`);
    await tx.raw(query);
  });
};

module.exports = { update };
