/* @flow */
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');

const formatMoney = (m: Money) => (Number(m) / 100.0).toFixed(2);

const report = async (date: Date, brandId: string): Promise<any> => {
  const h = moment(date).format('YYYY-MM-DD HH:mm:ss');
  const query = pg.raw(`SELECT
    "players"."id" AS "playerId",
    "players"."brandId",
    "players"."affiliateId",
    ((sum(bets.amount) + sum(bets."bonusAmount")) / conversion_rates."conversionRate") AS bets,
    ((sum(wins.amount) + sum(wins."bonusAmount")) / conversion_rates."conversionRate") AS wins,
    ((coalesce(sum(bonus_credit."bonusAmount"), 0) + coalesce(sum(adjustments."bonusAmount"), 0) - coalesce(sum(bonus_forfeit."bonusAmount"), 0)) / conversion_rates."conversionRate") AS bonuses,
    (sum(adjustments.amount) / conversion_rates."conversionRate") AS adjustments,
    sum(deposits.amount) / conversion_rates."conversionRate" AS deposits
    FROM "players"
    INNER JOIN "conversion_rates" ON "conversion_rates"."currencyId" = "players"."currencyId"
    LEFT OUTER JOIN (SELECT "playerId", sum("amount") AS "amount", sum("bonusAmount") AS "bonusAmount"  FROM "report_hourly_players" WHERE type in ('bet', 'cancel_win') AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") bets ON bets."playerId" = players.id
    LEFT OUTER JOIN (SELECT "playerId", sum("amount") AS "amount", sum("bonusAmount") AS "bonusAmount"  FROM "report_hourly_players" WHERE type in ('win', 'win_local_jackpot', 'cancel_bet') AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") wins ON wins."playerId" = players.id
    LEFT OUTER JOIN (SELECT "playerId", sum("bonusAmount") AS "bonusAmount" FROM "report_hourly_players" WHERE type = 'bonus_credit' AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") bonus_credit ON bonus_credit."playerId" = players.id
    LEFT OUTER JOIN (SELECT "playerId", sum("bonusAmount") AS "bonusAmount" FROM "report_hourly_players" WHERE type = 'bonus_forfeit' AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") bonus_forfeit ON bonus_forfeit."playerId" = players.id
    LEFT OUTER JOIN (SELECT "playerId", sum(amount) AS amount, sum("bonusAmount") AS "bonusAmount" FROM "report_hourly_players" WHERE type in ('win_freespins', 'wallet_compensation') AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") adjustments ON adjustments."playerId" = players.id
    LEFT OUTER JOIN (SELECT "playerId", (sum(amount) + sum("bonusAmount")) AS amount FROM "report_hourly_players" WHERE type = 'wallet_deposit' AND date_trunc('day', "hour") = date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') GROUP BY "playerId") deposits ON deposits."playerId" = players.id
    WHERE "players"."affiliateId" IS NOT NULL AND (bets."playerId" IS NOT NULL OR wins."playerId" IS NOT NULL OR bonus_forfeit IS NOT NULL OR bonus_credit."playerId" IS NOT NULL OR adjustments."playerId" IS NOT NULL OR deposits."playerId" IS NOT null) AND "brandId" = ?
    GROUP BY "players"."id", "conversion_rates"."conversionRate" ORDER BY deposits DESC nulls last`, [brandId]);
  const result = await query;

  return result.rows.map(row => ({
    transferId: moment().format('YYYYMMDD'),
    playerId: row.playerId,
    activityDate: moment(date).format('YYYY-MM-DD'),
    brandId: row.brandId,
    affiliateId: row.affiliateId,
    grossRevenue: formatMoney((row.bets || 0) - (row.wins || 0)),
    bonuses: formatMoney(row.bonuses || 0),
    adjustments: formatMoney(row.adjustments || 0),
    turnover: formatMoney(row.bets || 0),
    deposits: formatMoney(row.deposits || 0),
  }));
};

module.exports = { report };
