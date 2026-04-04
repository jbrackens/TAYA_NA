/* @flow */
 
import type { TxType } from "gstech-core/modules/clients/backend-api-types";
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const moment = require('moment-timezone');
const keys = require('lodash/fp/keys');
const groupBy = require('lodash/fp/groupBy');
const find = require('lodash/fp/find');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { formatMoney } = require('../core/money');
const { getAllMonthRates, getMonthRates } = require('../settings');

type SpanType = 'day' | 'week' | 'month' | 'year';

const spanFormat = {
  day: 'YYYY-MM-DD',
  week: 'YYYY / WW',
  month: 'YYYY / MM',
  year: 'YYYY',
};

const spanMapping = {
  day: 'month',
  week: 'month',
  month: 'year',
};

const report = async (
  brandId: ?string,
  span: SpanType,
  time: ?Date,
): Promise<
  Array<
    | {
        RTP: string,
        bets: string,
        compensations: string,
        grossWin: string,
        jackpots: string,
        title: empty,
        total: string,
        turnedReal: string,
        wins: string,
        rawBets: number,
        rawWins: number,
        rawJackpots: number,
        rawGrossWin: number,
        rawTurnedReal: number,
        rawCompensations: number,
        rawTotal: number,
      }
    | {
        RTP: string,
        bets: string,
        compensations: string,
        grossWin: string,
        jackpots: string,
        title: string,
        total: string,
        turnedReal: string,
        type: string,
        wins: string,
        rawBets: number,
        rawWins: number,
        rawJackpots: number,
        rawGrossWin: number,
        rawTurnedReal: number,
        rawCompensations: number,
        rawTotal: number,
      }>,
> => {
  logger.debug('ResultReport params', brandId, span, time);
  const query = [];
  const params: mixed[] = [];
  query.push(`SELECT "currencyId", date_trunc('${span}', day) AS timespan, type,
      sum(count) AS count,
      sum(amount) AS amount,
      sum("bonusAmount") AS "bonusAmount"
    FROM report_daily_brands`);

  let addWhere = true;
  if (span !== 'year') {
    const h = moment(time).format('YYYY-MM-DD HH:mm:ss');
    addWhere = false;
    query.push('WHERE');
    query.push(
      `date_trunc('${spanMapping[span]}', day) = date_trunc('${spanMapping[span]}', '${h}' AT TIME zone 'Europe/Rome')`,
    );
  }

  if (brandId != null) {
    query.push(addWhere ? 'WHERE' : 'AND');
    query.push('"brandId"=?');
    params.push(brandId);
  }
  query.push('GROUP BY "timespan", "currencyId", "type"');
  query.push('ORDER BY "timespan" desc');

  logger.debug('ResultsReport', query.join(' '), params);

  const q = pg.raw(query.join(' '), params);
  const { rows } = await q;

  const conversionRates = await getAllMonthRates();
  const fallbackConversionRates = await getMonthRates(time || new Date());

  const convertAmount = (amount: Money, currencyId: string, timespan: Date) => {
    let rate: ?{ ...ConversionRate, ... } = find<{ ...ConversionRate, month: any, ... }>(
      (row) =>
        row.currencyId === currencyId &&
        moment(row.month).format('YYYYMM') === moment(timespan).format('YYYYMM'),
    )(conversionRates);
    if (rate == null) {
      rate = find<ConversionRate>((row) => row.currencyId === currencyId)(fallbackConversionRates);
    }
    if (rate && rate.conversionRate !== 1) {
      const result = amount / rate.conversionRate;
      return result;
    }
    return amount;
  };

  const groups = groupBy<string, { ...ConversionRate, timespan: Date, ... }>(({ timespan }) =>
    moment(timespan).format(spanFormat[span]),
  )(rows);
  logger.debug('groups', groups);
  const result: any[] = [];
  const calculateValues = (
    items: any[],
    predicate: ({ currencyId: string }) => boolean,
    convertAmounts: boolean = false,
  ) => {
    const valueOf = (field: TxType) =>
      items
        .filter(predicate)
        .filter((row) => row.type === field)
        .map(({ amount, currencyId, timespan }) =>
          convertAmounts ? convertAmount(amount, currencyId, timespan) : amount,
        )
        .reduce((a, b) => a + b, 0);

    const bets = valueOf('bet') - valueOf('cancel_bet');
    const wins = valueOf('win') + valueOf('win_local_jackpot') - valueOf('cancel_win');
    const grossWin = bets - wins;
    const turnToReal = valueOf('turn_bonus_to_real');
    const compensations =
      valueOf('wallet_compensation') +
      valueOf('wallet_correction') +
      valueOf('wallet_transaction_fee_return') -
      valueOf('wallet_transaction_fee') +
      valueOf('win_freespins');
    const jackpots = valueOf('win_jackpot');
    const total = bets - wins - compensations - turnToReal;
    const RTP = bets > 0 ? Number((100 * wins) / bets).toFixed(1) : '-';
    return {
      bets,
      wins,
      grossWin,
      turnToReal,
      compensations,
      jackpots,
      total,
      RTP,
    };
  };

  keys(groups).forEach((key) => {
    const subTotalRow = calculateValues(groups[key], () => true, true);
    result.push({
      title: key,
      bets: formatMoney(subTotalRow.bets, 'EUR'),
      wins: formatMoney(subTotalRow.wins, 'EUR'),
      jackpots: formatMoney(subTotalRow.jackpots, 'EUR'),
      grossWin: formatMoney(subTotalRow.grossWin, 'EUR'),
      RTP: subTotalRow.RTP,
      turnedReal: formatMoney(subTotalRow.turnToReal, 'EUR'),
      compensations: formatMoney(subTotalRow.compensations, 'EUR'),
      total: formatMoney(subTotalRow.total, 'EUR'),
      rawBets: subTotalRow.bets,
      rawWins: subTotalRow.wins,
      rawJackpots: subTotalRow.jackpots,
      rawGrossWin: subTotalRow.grossWin,
      rawTurnedReal: subTotalRow.turnToReal,
      rawCompensations: subTotalRow.compensations,
      rawTotal: subTotalRow.total,
    });
  });
  const totalRow = calculateValues(rows, () => true, true);
  result.push({
    title: 'TOTAL',
    type: 'total',
    bets: formatMoney(totalRow.bets, 'EUR'),
    wins: formatMoney(totalRow.wins, 'EUR'),
    jackpots: formatMoney(totalRow.jackpots, 'EUR'),
    grossWin: formatMoney(totalRow.grossWin, 'EUR'),
    RTP: totalRow.RTP,
    turnedReal: formatMoney(totalRow.turnToReal, 'EUR'),
    compensations: formatMoney(totalRow.compensations, 'EUR'),
    total: formatMoney(totalRow.total, 'EUR'),
    rawBets: totalRow.bets,
    rawWins: totalRow.wins,
    rawJackpots: totalRow.jackpots,
    rawGrossWin: totalRow.grossWin,
    rawTurnedReal: totalRow.turnToReal,
    rawCompensations: totalRow.compensations,
    rawTotal: totalRow.total,
  });
  return result;
};

module.exports = { report };
