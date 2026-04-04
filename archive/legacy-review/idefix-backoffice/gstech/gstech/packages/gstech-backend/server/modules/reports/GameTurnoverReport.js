/* @flow */
 
import type { TxType } from 'gstech-core/modules/clients/backend-api-types';
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const moment = require('moment-timezone');
const find = require('lodash/fp/find');
const uniq = require('lodash/fp/uniq');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');
const { getMonthRates } = require('../settings');

const queryReport = async (month: Date, brandId: ?string) => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const query = `SELECT
      "brands"."id" as "brandId",
      "brands"."name" as "brand",
      "games"."name" as "name",
      "games"."id" as "gameId",
      "game_manufacturers"."name" as "manufacturer",
      "report_daily_games_brands"."currencyId",
      "report_daily_games_brands"."type",
      sum("report_daily_games_brands"."count") AS "count",
      sum("report_daily_games_brands"."amount") AS "amount",
      sum("report_daily_games_brands"."bonusAmount") AS "bonusAmount"
    FROM report_daily_games_brands
    JOIN brands on brands.id=report_daily_games_brands."brandId"
    JOIN games ON report_daily_games_brands."gameId"=games.id
    JOIN game_manufacturers on games."manufacturerId"=game_manufacturers.id
    WHERE date_trunc('month', report_daily_games_brands.day AT TIME zone 'Europe/Rome') = date_trunc('month', '${h}' AT TIME zone 'Europe/Rome')`;
  const params: mixed[] = [];
  const groupBy =
    ' GROUP BY game_manufacturers.id, games.id, brands."id", report_daily_games_brands."currencyId", "report_daily_games_brands"."type"';
  if (brandId != null) {
    params.push(brandId);
  }
  const extraWhere = brandId != null ? 'AND report_daily_games_brands."brandId"=?' : '';
  const result = await pg.raw(query + extraWhere + groupBy, params);
  return result.rows;
};

type GameTurnoverReportRow =
  | {
      bets: string,
      bonusBets: string,
      bonusWins: string,
      jackpots: string,
      manufacturer: any,
      payout: string,
      rounds: any,
      title: any,
      totalBets: string,
      totalWins: string,
      type: string,
      wins: string,
      rawWins: number,
      rawBets: number,
      rawBonusWins: number,
      rawBonusBets: number,
      rawJackpots: number,
      rawTotalWins: number,
      rawTotalBets: number,
    }
  | {
      bets: string,
      bonusBets: string,
      bonusWins: string,
      jackpots: string,
      manufacturer: string,
      payout: string,
      rounds: any,
      title: any,
      totalBets: string,
      totalWins: string,
      wins: string,
      rawWins: number,
      rawBets: number,
      rawBonusWins: number,
      rawBonusBets: number,
      rawJackpots: number,
      rawTotalWins: number,
      rawTotalBets: number,
    }
  | {
      bets: string,
      bonusBets: string,
      bonusWins: string,
      currencyId: string,
      jackpots: string,
      manufacturer: string,
      payout: string,
      rounds: any,
      title: string,
      totalBets: string,
      totalWins: string,
      type: string,
      wins: string,
      rawWins: number,
      rawBets: number,
      rawBonusWins: number,
      rawBonusBets: number,
      rawJackpots: number,
      rawTotalWins: number,
      rawTotalBets: number,
    };

const report = async (month: Date, selectedBrandId: ?string): Promise<GameTurnoverReportRow[]> => {
  const rows = await queryReport(month, selectedBrandId);
  const games = uniq(rows.map(({ gameId }) => gameId));
  const currencies = uniq(rows.map(({ currencyId }) => currencyId));
  const conversionRates = await getMonthRates(month);

  const convertAmount = (amount: Money, currencyId: string) => {
    const rate = find<ConversionRate>((row) => row.currencyId === currencyId)(conversionRates);
    if (rate && rate.conversionRate !== 1) {
      return amount / rate.conversionRate;
    }
    return amount;
  };
  const calculateValues = (
    predicate: ({ currencyId: string, brandId: string, gameId: Id }) => boolean,
    convertAmounts: boolean = false,
  ) => {
    const matchingRows = rows.filter(predicate);
    if (matchingRows.length === 0) {
      return null;
    }

    const initialValue = matchingRows[0];
    const valueOf = (field: TxType) =>
      matchingRows
        .filter((row) => row.type === field)
        .map(({ amount, currencyId }) =>
          convertAmounts ? convertAmount(amount, currencyId) : amount,
        )
        .reduce((a, b) => a + b, 0);

    const countSum = (field: TxType) =>
      matchingRows
        .filter((row) => row.type === field)
        .map(({ count }) => Number(count))
        .reduce((a, b) => a + b, 0);

    const bonusValueOf = (field: TxType) =>
      matchingRows
        .filter((row) => row.type === field)
        .map(({ bonusAmount, currencyId }) =>
          convertAmounts ? convertAmount(bonusAmount, currencyId) : bonusAmount,
        )
        .reduce((a, b) => a + b, 0);

    const wins = valueOf('win') + valueOf('win_local_jackpot') - valueOf('cancel_win');
    const jackpots = valueOf('win_jackpot');
    const bonusWins =
      bonusValueOf('win') +
      bonusValueOf('win_jackpot') +
      bonusValueOf('win_local_jackpot') -
      bonusValueOf('cancel_win');
    const bets = valueOf('bet') - valueOf('cancel_bet');
    const bonusBets = bonusValueOf('bet') - bonusValueOf('cancel_bet');
    const totalBets = bonusBets + bets;
    const totalWins = bonusWins + wins;
    const payout = Number((100 * totalWins) / totalBets).toFixed(2);
    const rounds = countSum('bet');
    return {
      initialValue,
      wins,
      bonusWins,
      bets,
      bonusBets,
      jackpots,
      totalBets,
      totalWins,
      payout,
      rounds,
    };
  };
  const result: GameTurnoverReportRow[] = [];

  games.forEach((gameId) => {
    const values = calculateValues((row) => row.gameId === gameId, true);
    if (values != null) {
      result.push({
        title: values.initialValue.name,
        manufacturer: values.initialValue.manufacturer,
        type: 'total',
        wins: formatMoney(values.wins, 'EUR'),
        bets: formatMoney(values.bets, 'EUR'),
        bonusWins: formatMoney(values.bonusWins, 'EUR'),
        bonusBets: formatMoney(values.bonusBets, 'EUR'),
        totalWins: formatMoney(values.totalWins, 'EUR'),
        totalBets: formatMoney(values.totalBets, 'EUR'),
        jackpots: formatMoney(values.jackpots, 'EUR'),
        rounds: values.rounds,
        payout: values.payout,
        rawWins: values.wins,
        rawBets: values.bets,
        rawBonusWins: values.bonusWins,
        rawBonusBets: values.bonusBets,
        rawTotalWins: values.totalWins,
        rawTotalBets: values.totalBets,
        rawJackpots: values.jackpots,
      });
    }

    currencies.forEach((currencyId) => {
      const gameValues = calculateValues(
        (row) => row.gameId === gameId && row.currencyId === currencyId,
      );
      if (gameValues !== null) {
        result.push({
          title: currencyId,
          manufacturer: '',
          wins: formatMoney(gameValues.wins, currencyId),
          bets: formatMoney(gameValues.bets, currencyId),
          bonusWins: formatMoney(gameValues.bonusWins, currencyId),
          bonusBets: formatMoney(gameValues.bonusBets, currencyId),
          jackpots: formatMoney(gameValues.jackpots, currencyId),
          totalWins: formatMoney(gameValues.totalWins, currencyId),
          totalBets: formatMoney(gameValues.totalBets, currencyId),
          rounds: gameValues.rounds,
          payout: gameValues.payout,
          rawWins: gameValues.wins,
          rawBets: gameValues.bets,
          rawBonusWins: gameValues.bonusWins,
          rawBonusBets: gameValues.bonusBets,
          rawJackpots: gameValues.jackpots,
          rawTotalWins: gameValues.totalWins,
          rawTotalBets: gameValues.totalBets,
        });
      }
    });
  });
  const values = calculateValues(() => true, true);
  if (values != null) {
    result.push({
      title: 'TOTAL',
      manufacturer: '',
      currencyId: 'EUR',
      type: 'total',
      wins: formatMoney(values.wins, 'EUR'),
      bets: formatMoney(values.bets, 'EUR'),
      bonusWins: formatMoney(values.bonusWins, 'EUR'),
      bonusBets: formatMoney(values.bonusBets, 'EUR'),
      jackpots: formatMoney(values.jackpots, 'EUR'),
      totalWins: formatMoney(values.totalWins, 'EUR'),
      totalBets: formatMoney(values.totalBets, 'EUR'),
      rounds: values.rounds,
      payout: values.payout,
      rawWins: values.wins,
      rawBets: values.bets,
      rawBonusWins: values.bonusWins,
      rawBonusBets: values.bonusBets,
      rawJackpots: values.jackpots,
      rawTotalWins: values.totalWins,
      rawTotalBets: values.totalBets,
    });
  }
  return result;
};
module.exports = { report };
