/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const run = async () => {
  const results = await pg.raw(`select daily."currencyId",
                        daily.day,
                        daily.type,
                        sum(daily.sum)                   as daily,
                        sum(hourly.sum)                  as hourly,
                        sum(game.sum)                    as game,
                        sum(daily.sum) - sum(hourly.sum) as diff,
                        sum(daily.sum) - sum(game.sum)   as diff2
                 from (select sum(amount) as sum, "currencyId", type, "day" from report_daily_brands group by type, day, "currencyId") daily
                          left outer join (select sum(amount) as sum, "currencyId", type, date_trunc('day', hour) as day
                                           from report_hourly_players
                                                    join players on report_hourly_players."playerId" = players.id
                                           where "testPlayer" = false
                                           group by type, date_trunc('day', hour), "currencyId") hourly on daily.day = hourly.day and daily.type = hourly.type and daily."currencyId" = hourly."currencyId"
                          left outer join (select sum(amount) as sum, "currencyId", type, day
                                           from report_daily_player_game_summary
                                                    join players on report_daily_player_game_summary."playerId" = players.id
                                           where "testPlayer" = false
                                           group by type, day, "currencyId") game on daily.day = game.day and daily.type = game.type and daily."currencyId" = game."currencyId"
                 where daily.day > now() - '4 months'::interval
                   and hourly.day > now() - '4 months'::interval
                   and game.day > now() - '4 months'::interval
                   and daily.day < date_trunc('day', now())
                   and hourly.day < date_trunc('day', now())
                   and game.day < date_trunc('day', now())
                 group by daily.day, daily.type, daily."currencyId"
                 having sum(daily.sum) != sum(hourly.sum)
                     or sum(daily.sum) != sum(game.sum)`);

  if (results.length) {
    logger.error('ReportIntegrityCheckJob found incorrect rows: ', JSON.stringify(results, null, 2));
  }
};

module.exports = { run };
