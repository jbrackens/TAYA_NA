/* @flow */
 
const moment = require('moment-timezone');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');

type LicenseReportRow = {
    bonusBets: string,
    compensations: string,
    realBets: string,
    title: string,
    wdWinnings: string,
    rawRealBets: number,
    rawBonusBets: number,
    rawCompensations: number,
    rawWdWinnings: number,
    type?: string,
  }

const report = async (
  license: ?string,
  month: Date,
  countryId: ?string,
  gameProfile?: string,
): Promise<LicenseReportRow[]> => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const countryQuery = countryId == null ? '' : ` AND players."countryId"='${countryId}' `;
  const gameProfileQuery = gameProfile == null ? '' : `AND game_profiles."name"='${gameProfile}'`;
  const query = pg.raw(
    `
    select
      bets."currencyId",
      coalesce(bets."realAmount", 0)-coalesce(bet_cancels."realAmount", 0) as "betsReal",
      coalesce(bets."realAmountEUR", 0)-coalesce(bet_cancels."realAmountEUR", 0) as "betsRealEUR",
      coalesce(bets."bonusAmount", 0)-coalesce(bet_cancels."bonusAmount", 0) as "bonusBets",
      coalesce(bets."bonusAmountEUR", 0)-coalesce(bet_cancels."bonusAmountEUR", 0) as "bonusBetsEUR",
      coalesce(bonusturnedreal.amount, 0) + coalesce(wins."realAmount", 0) - coalesce(win_cancels."realAmount", 0) as "wdWinnings",
      coalesce(bonusturnedreal."amountEUR", 0) + coalesce(wins."realAmountEUR", 0)-coalesce(win_cancels."realAmountEUR", 0) as "wdWinningsEUR",
      coalesce(compensations.amount, 0)-coalesce(negativecompensations.amount, 0) as "compensations",
      coalesce(compensations."amountEUR", 0)-coalesce(negativecompensations."amountEUR", 0) as "compensationsEUR"
      from
        (select
          type,
          players."currencyId",
          sum(amount) as "realAmount",
          sum("bonusAmount") as "bonusAmount",
          sum(amount / monthly_conversion_rates."conversionRate") as "realAmountEUR",
          sum("bonusAmount" / monthly_conversion_rates."conversionRate") as "bonusAmountEUR"
        from report_daily_player_game_summary
        join game_manufacturers on report_daily_player_game_summary."manufacturerId"=game_manufacturers.id
        join players on report_daily_player_game_summary."playerId"=players.id
        join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', day)
        left join brand_game_profiles on report_daily_player_game_summary."gameId"=brand_game_profiles."gameId" and brand_game_profiles."brandId" = players."brandId"
        left join game_profiles on brand_game_profiles."gameProfileId"=game_profiles.id
        where
          type='bet'
          and day between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          and "testPlayer"=false
          and license=?
          ${countryQuery}
          ${gameProfileQuery}
        group by type, players."currencyId"
        order by players."currencyId", type
        ) bets left outer join
        (select
          type,
          players."currencyId",
          sum(amount) as "realAmount",
          sum("bonusAmount") as "bonusAmount",
          sum(amount / monthly_conversion_rates."conversionRate") as "realAmountEUR",
          sum("bonusAmount" / monthly_conversion_rates."conversionRate") as "bonusAmountEUR"
        from report_daily_player_game_summary
        join game_manufacturers on report_daily_player_game_summary."manufacturerId"=game_manufacturers.id
        join players on report_daily_player_game_summary."playerId"=players.id
        join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', day)
        left join brand_game_profiles on report_daily_player_game_summary."gameId"=brand_game_profiles."gameId" and brand_game_profiles."brandId" = players."brandId"
        left join game_profiles on brand_game_profiles."gameProfileId"=game_profiles.id
        where
          type='cancel_bet'
          and day between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          and "testPlayer"=false
          and license=?
          ${countryQuery}
          ${gameProfileQuery}
        group by type, players."currencyId"
        order by players."currencyId", type
        ) bet_cancels on bet_cancels."currencyId"=bets."currencyId"
        left outer join
            (select
          'win' as type,
          players."currencyId",
          sum(amount) as "realAmount",
          sum("bonusAmount") as "bonusAmount",
          sum(amount / monthly_conversion_rates."conversionRate") as "realAmountEUR",
          sum("bonusAmount" / monthly_conversion_rates."conversionRate") as "bonusAmountEUR"
        from report_daily_player_game_summary
        join game_manufacturers on report_daily_player_game_summary."manufacturerId"=game_manufacturers.id
        join players on report_daily_player_game_summary."playerId"=players.id
        join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', day)
        left join brand_game_profiles on report_daily_player_game_summary."gameId"=brand_game_profiles."gameId" and brand_game_profiles."brandId" = players."brandId"
        left join game_profiles on brand_game_profiles."gameProfileId"=game_profiles.id
        where
          type in ('win', 'win_local_jackpot')
          and day between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          and "testPlayer"=false
          and license=?
          ${countryQuery}
          ${gameProfileQuery}
        group by players."currencyId"
        order by players."currencyId"
        ) wins on bets."currencyId"=wins."currencyId"
        left outer join
          (select
            type,
            players."currencyId",
            sum(amount) as "realAmount",
            sum("bonusAmount") as "bonusAmount",
            sum(amount / monthly_conversion_rates."conversionRate") as "realAmountEUR",
            sum("bonusAmount" / monthly_conversion_rates."conversionRate") as "bonusAmountEUR"
          from report_daily_player_game_summary
          join game_manufacturers on report_daily_player_game_summary."manufacturerId"=game_manufacturers.id
          join players on report_daily_player_game_summary."playerId"=players.id
          join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', day)
          left join brand_game_profiles on report_daily_player_game_summary."gameId"=brand_game_profiles."gameId" and brand_game_profiles."brandId" = players."brandId"
          left join game_profiles on brand_game_profiles."gameProfileId"=game_profiles.id
          where
            type='cancel_win'
            and day between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
            and "testPlayer"=false
            and license=?
            ${countryQuery}
            ${gameProfileQuery}
          group by type, players."currencyId"
          order by players."currencyId", type
          ) win_cancels on bets."currencyId"=win_cancels."currencyId"
          left outer join (
          SELECT players."currencyId",
            sum(amount) AS amount,
            sum(amount/monthly_conversion_rates."conversionRate") AS "amountEUR"
          FROM report_hourly_players
          JOIN players ON report_hourly_players."playerId"=players.id
          JOIN monthly_conversion_rates ON players."currencyId"="monthly_conversion_rates"."currencyId" AND monthly_conversion_rates."month"=date_trunc('month', hour)
          WHERE hour between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          AND "testPlayer"=FALSE
          AND type='turn_bonus_to_real'
          ${countryQuery}
          AND TRUE = ${gameProfile == null || gameProfile === 'Slots' ? 'TRUE' : 'FALSE'}
          GROUP BY players."currencyId"
        ) bonusturnedreal on bonusturnedreal."currencyId"=bets."currencyId"
        left outer join (
          SELECT players."currencyId",
            sum(amount) AS amount,
            sum(amount/monthly_conversion_rates."conversionRate") AS "amountEUR"
          FROM report_hourly_players
          join players on report_hourly_players."playerId"=players.id
          join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', hour)
          WHERE hour between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          AND "testPlayer"=false
          ${countryQuery}
          AND TRUE = ${gameProfile == null || gameProfile === 'Slots' ? 'TRUE' : 'FALSE'}
          and type IN('wallet_compensation', 'wallet_correction', 'wallet_transaction_fee_return', 'win_freespins')
          group by players."currencyId"
        ) compensations on compensations."currencyId"=bets."currencyId"
        left outer join (
          SELECT players."currencyId",
            sum(amount) AS amount,
            sum(amount/monthly_conversion_rates."conversionRate") AS "amountEUR"
          FROM report_hourly_players
          join players on report_hourly_players."playerId"=players.id
          join monthly_conversion_rates on players."currencyId"="monthly_conversion_rates"."currencyId" and monthly_conversion_rates."month"=date_trunc('month', hour)
          WHERE hour between date_trunc('month', '${h}' AT TIME zone 'Europe/Rome') and date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')+'1 month'::interval-'1 usec'::interval
          AND "testPlayer"=false
          and type IN('wallet_transaction_fee')
          ${countryQuery}
          AND TRUE = ${gameProfile == null || gameProfile === 'Slots' ? 'TRUE' : 'FALSE'}
          group by players."currencyId"
        ) negativecompensations on negativecompensations."currencyId"=bets."currencyId"`,
    [license, license, license, license],
  );

  const { rows }: { rows: any[] } = await query;

  const result: LicenseReportRow[] = [];
  const sum = (r: any[], key: string) =>
    r.reduce((a, b) => {
      const value = b[key];
      return a + value;
    }, 0);

  for (const row of rows) {
    result.push({
      title: 'EUR',
      type: 'total',
      realBets: formatMoney(row.betsRealEUR, 'EUR'),
      bonusBets: formatMoney(row.bonusBetsEUR, 'EUR'),
      compensations: formatMoney(row.compensationsEUR, 'EUR'),
      wdWinnings: formatMoney(row.wdWinningsEUR, 'EUR'),
      rawRealBets: row.betsRealEUR,
      rawBonusBets: row.bonusBetsEUR,
      rawCompensations: row.compensationsEUR,
      rawWdWinnings: row.wdWinningsEUR,
    });
    result.push({
      title: row.currencyId,
      realBets: formatMoney(row.betsReal, row.currencyId),
      bonusBets: formatMoney(row.bonusBets, row.currencyId),
      compensations: formatMoney(row.compensations, row.currencyId),
      wdWinnings: formatMoney(row.wdWinnings, row.currencyId),
      rawRealBets: row.betsReal,
      rawBonusBets: row.bonusBets,
      rawCompensations: row.compensations,
      rawWdWinnings: row.wdWinnings,
    });
  }
  result.push({
    title: 'TOTAL',
    type: 'total',
    realBets: formatMoney(sum(rows, 'betsRealEUR'), 'EUR'),
    bonusBets: formatMoney(sum(rows, 'bonusBetsEUR'), 'EUR'),
    compensations: formatMoney(sum(rows, 'compensationsEUR'), 'EUR'),
    wdWinnings: formatMoney(sum(rows, 'wdWinningsEUR'), 'EUR'),
    rawRealBets: sum(rows, 'betsRealEUR'),
    rawBonusBets: sum(rows, 'bonusBetsEUR'),
    rawCompensations: sum(rows, 'compensationsEUR'),
    rawWdWinnings: sum(rows, 'wdWinningsEUR'),
  });
  return result;
};

module.exports = { report };
