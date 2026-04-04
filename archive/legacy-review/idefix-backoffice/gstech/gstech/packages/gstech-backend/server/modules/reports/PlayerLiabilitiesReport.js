/* @flow */
 
import type { TxType } from 'gstech-core/modules/clients/backend-api-types';

const _ = require('lodash');
const moment = require('moment-timezone');
const uniq = require('lodash/fp/uniq');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const { formatMoney } = require('../core/money');
const { currencyConversion } = require('./money-utils');
const { getMonthRates } = require('../settings');

const queryReport = async (month: Date, brandId: ?string) => {
  const h = moment(month).format('YYYY-MM-DD HH:mm:ss');
  const monthTz = (m: string) => `date_trunc('month', '${m}' at time zone 'Europe/Rome')`;
  const cSum = (table: string, field: string = 'amount') =>
    `coalesce(sum("${table}"."${field}"), 0)`;
  const brandCyJoin = (qb: Knex$QueryBuilder<any>, alias: string, sb: Knex$QueryBuilder<any>) =>
    qb.leftJoin(sb.as(alias), (qb) =>
      qb.on(`${alias}.currencyId`, 'currencies.id').andOn(`${alias}.brandId`, 'brands.id'),
    );
  const accountStatements = (m: string, nextMonth: boolean = false) =>
    pg('account_statements')
      .select('players.brandId', 'players.currencyId')
      .sum({
        balance: 'account_statements.balance',
        reservedBalance: 'account_statements.reservedBalance',
      })
      .join('players', 'account_statements.playerId', 'players.id')
      .where({
        'players.testPlayer': false,
        'account_statements.month': pg.raw(
          `${monthTz(m)} ${nextMonth ? "+ interval '1 month'" : ''}`,
        ),
      })
      .groupBy('players.brandId', 'players.currencyId');
  const reportDailyBrands = (m: string, txTypes: string[]) =>
    pg('report_daily_brands')
      .sum({ amount: 'amount' })
      .select('brandId', 'currencyId')
      .whereIn('type', txTypes)
      .whereBetween('day', [
        pg.raw(monthTz(m)),
        pg.raw(`${monthTz(m)} + interval '1 month' - interval '1 usec'`),
      ])
      .groupBy('brandId', 'currencyId');
  return await pg('brands')
    .select(
      _.mapValues(
        {
          brandId: 'brands.id',
          brand: 'brands.name',
          currencyId: 'currencies.id',
          startBalance: cSum('prev', 'balance'),
          startReservedBalance: cSum('prev', 'reservedBalance'),
          endBalance: 'sum(next.balance)',
          endReservedBalance: 'sum(next."reservedBalance")',
          wallet_deposit: cSum('wallet_deposit'),
          wallet_withdrawal_processed: cSum('wallet_withdrawal_processed'),
          win: `${cSum('win')}-${cSum('win_cancel')}`,
          bet: `${cSum('bet')}-${cSum('bet_cancel')}`,
          turn_bonus_to_real: cSum('turn_bonus_to_real'),
          wallet_compensation: cSum('wallet_compensation'),
          wallet_correction: `${cSum('wallet_correction')}-${cSum('wallet_transaction_fee')}`,
          win_freespins: cSum('win_freespins'),
        },
        (s) => pg.raw(s),
      ),
    )
    .join('currencies', 'brands.id', 'currencies.brandId')
    .modify(brandCyJoin, 'prev', accountStatements(h))
    .modify(brandCyJoin, 'next', accountStatements(h, true))
    .modify(brandCyJoin, 'wallet_deposit', reportDailyBrands(h, ['wallet_deposit']))
    .modify(
      brandCyJoin,
      'wallet_withdrawal_processed',
      reportDailyBrands(h, ['wallet_withdrawal_processed']),
    )
    .modify(brandCyJoin, 'win', reportDailyBrands(h, ['win', 'win_jackpot', 'win_local_jackpot']))
    .modify(brandCyJoin, 'win_cancel', reportDailyBrands(h, ['cancel_win']))
    .modify(brandCyJoin, 'bet', reportDailyBrands(h, ['bet']))
    .modify(brandCyJoin, 'bet_cancel', reportDailyBrands(h, ['cancel_bet']))
    .modify(brandCyJoin, 'turn_bonus_to_real', reportDailyBrands(h, ['turn_bonus_to_real']))
    .modify(brandCyJoin, 'wallet_compensation', reportDailyBrands(h, ['wallet_compensation']))
    .modify(
      brandCyJoin,
      'wallet_correction',
      reportDailyBrands(h, ['wallet_correction', 'wallet_transaction_fee_return']),
    )
    .modify(brandCyJoin, 'win_freespins', reportDailyBrands(h, ['win_freespins']))
    .modify(brandCyJoin, 'wallet_transaction_fee', reportDailyBrands(h, ['wallet_transaction_fee']))
    .modify((qb) => (brandId != null ? qb.where('brands.id', brandId) : qb))
    .groupBy('brands.id', 'currencies.id')
    .orderBy(['currencies.id', 'brands.name']);
};

type ReportRow = Partial<{
  bets: string,
  compensations: string,
  corrections: string,
  deposits: string,
  endBalance: string,
  freespins: string,
  startBalance: string,
  title: string,
  turnToReal: string,
  type: string,
  wins: string,
  withdrawals: string,
  brandId: string,
  currencyId: string,
  title: string,
  rawStartBalance: number,
  rawDeposits: number,
  rawWithdrawals: number,
  rawWins: number,
  rawBets: number,
  rawTurnToReal: number,
  rawCompensations: number,
  rawCorrections: number,
  rawFreespins: number,
  rawEndBalance: number,
}>;

const report = async (month: Date, selectedBrandId: ?string): Promise<ReportRow[]> => {
  const rows = await queryReport(month, selectedBrandId);
  const brands = uniq(rows.map(({ brandId }) => brandId));
  const currencies = uniq(rows.map(({ currencyId }) => currencyId));
  const conversionRates = await getMonthRates(month);
  const convertAmount = currencyConversion(conversionRates);

  const calculateValues = (
    predicate: ({ currencyId: string, brandId: string }) => boolean,
    convertAmounts: boolean = false,
  ) => {
    const matchingRows = rows.filter(predicate);
    if (matchingRows.length === 0) return null;

    const sum = (source: any, key: TxType | string) =>
      source
        .map((row) => (convertAmounts ? convertAmount(row[key], row.currencyId) : row[key]))
        .reduce((a, b) => a + b, 0);
    const valueOf = (field: TxType) => sum(matchingRows, field);
    const deposits = valueOf('wallet_deposit');
    const withdrawals = valueOf('wallet_withdrawal_processed');
    const wins = valueOf('win');
    const bets = valueOf('bet');
    const turnToReal = valueOf('turn_bonus_to_real');
    const compensations = valueOf('wallet_compensation');
    const corrections = valueOf('wallet_correction');
    const freespins = valueOf('win_freespins');
    const credits = deposits + wins + turnToReal + compensations + corrections + freespins;
    const debits = bets + withdrawals;
    const startBalance =
      sum(matchingRows, 'startBalance') + sum(matchingRows, 'startReservedBalance');
    const comparisonBalance = startBalance + credits - debits;
    const endBalanceRows = matchingRows.filter((x) => x.endBalance != null);
    const endBalance =
      endBalanceRows.length > 0
        ? sum(endBalanceRows, 'endBalance') + sum(endBalanceRows, 'endReservedBalance')
        : comparisonBalance;
    const discrepancy = comparisonBalance - endBalance;

    if (Math.abs(discrepancy) >= 1)
      logger.warn(
        '!!! PlayerLiabilitiesReport',
        moment(month).format('YYYY-MM'),
        (discrepancy / 100).toFixed(2),
        `${(endBalance / 100).toFixed(2)} - ${(comparisonBalance / 100).toFixed(2)}`,
        _.mapValues(
          {
            deposits,
            withdrawals,
            wins,
            bets,
            turnToReal,
            compensations,
            corrections,
            freespins,
            credits,
            debits,
            startBalance,
            comparisonBalance,
            endBalance,
            discrepancy,
          },
          (x) => (x / 100).toFixed(2),
        ),
      );
    return {
      matchingRows,
      deposits,
      withdrawals,
      wins,
      bets,
      turnToReal,
      compensations,
      corrections,
      freespins,
      credits,
      debits,
      startBalance,
      endBalance,
    };
  };
  const result: ReportRow[] = [];

  currencies.forEach((currencyId) => {
    const values = calculateValues((row) => row.currencyId === currencyId, true);
    if (values != null)
      result.push({
        title: currencyId,
        type: 'total',
        startBalance: formatMoney(values.startBalance, 'EUR'),
        deposits: formatMoney(values.deposits, 'EUR'),
        withdrawals: formatMoney(values.withdrawals, 'EUR'),
        wins: formatMoney(values.wins, 'EUR'),
        bets: formatMoney(values.bets, 'EUR'),
        turnToReal: formatMoney(values.turnToReal, 'EUR'),
        compensations: formatMoney(values.compensations, 'EUR'),
        corrections: formatMoney(values.corrections, 'EUR'),
        freespins: formatMoney(values.freespins, 'EUR'),
        endBalance: formatMoney(values.endBalance, 'EUR'),
        rawStartBalance: values.startBalance,
        rawDeposits: values.deposits,
        rawWithdrawals: values.withdrawals,
        rawWins: values.wins,
        rawBets: values.bets,
        rawTurnToReal: values.turnToReal,
        rawCompensations: values.compensations,
        rawCorrections: values.corrections,
        rawFreespins: values.freespins,
        rawEndBalance: values.endBalance,
      });
    let brandCount = 0;
    brands.forEach((brandId) => {
      const brandValues = calculateValues(
        (row) => row.brandId === brandId && row.currencyId === currencyId,
      );
      if (brandValues !== null) {
        brandCount += 1;
        result.push({
          title: brandValues.matchingRows[0].brand,
          brandId,
          currencyId,
          startBalance: formatMoney(brandValues.startBalance, currencyId),
          deposits: formatMoney(brandValues.deposits, currencyId),
          withdrawals: formatMoney(brandValues.withdrawals, currencyId),
          wins: formatMoney(brandValues.wins, currencyId),
          bets: formatMoney(brandValues.bets, currencyId),
          turnToReal: formatMoney(brandValues.turnToReal, currencyId),
          compensations: formatMoney(brandValues.compensations, currencyId),
          corrections: formatMoney(brandValues.corrections, currencyId),
          freespins: formatMoney(brandValues.freespins, currencyId),
          endBalance: formatMoney(brandValues.endBalance, currencyId),
          rawStartBalance: brandValues.startBalance,
          rawDeposits: brandValues.deposits,
          rawWithdrawals: brandValues.withdrawals,
          rawWins: brandValues.wins,
          rawBets: brandValues.bets,
          rawTurnToReal: brandValues.turnToReal,
          rawCompensations: brandValues.compensations,
          rawCorrections: brandValues.corrections,
          rawFreespins: brandValues.freespins,
          rawEndBalance: brandValues.endBalance,
        });
      }
    });
    if (brandCount > 1) {
      const currencyTotals = calculateValues((row) => row.currencyId === currencyId);
      if (currencyTotals != null)
        result.push({
          title: 'Subtotal',
          currencyId,
          startBalance: formatMoney(currencyTotals.startBalance, currencyId),
          deposits: formatMoney(currencyTotals.deposits, currencyId),
          withdrawals: formatMoney(currencyTotals.withdrawals, currencyId),
          wins: formatMoney(currencyTotals.wins, currencyId),
          bets: formatMoney(currencyTotals.bets, currencyId),
          turnToReal: formatMoney(currencyTotals.turnToReal, currencyId),
          compensations: formatMoney(currencyTotals.compensations, currencyId),
          corrections: formatMoney(currencyTotals.corrections, currencyId),
          freespins: formatMoney(currencyTotals.freespins, currencyId),
          endBalance: formatMoney(currencyTotals.endBalance, currencyId),
          rawStartBalance: currencyTotals.startBalance,
          rawDeposits: currencyTotals.deposits,
          rawWithdrawals: currencyTotals.withdrawals,
          rawWins: currencyTotals.wins,
          rawBets: currencyTotals.bets,
          rawTurnToReal: currencyTotals.turnToReal,
          rawCompensations: currencyTotals.compensations,
          rawCorrections: currencyTotals.corrections,
          rawFreespins: currencyTotals.freespins,
          rawEndBalance: currencyTotals.endBalance,
        });
    }
  });
  const values = calculateValues(() => true, true);
  if (values != null)
    result.push({
      title: 'TOTAL',
      currencyId: 'EUR',
      type: 'total',
      startBalance: formatMoney(values.startBalance, 'EUR'),
      deposits: formatMoney(values.deposits, 'EUR'),
      withdrawals: formatMoney(values.withdrawals, 'EUR'),
      wins: formatMoney(values.wins, 'EUR'),
      bets: formatMoney(values.bets, 'EUR'),
      turnToReal: formatMoney(values.turnToReal, 'EUR'),
      compensations: formatMoney(values.compensations, 'EUR'),
      corrections: formatMoney(values.corrections, 'EUR'),
      freespins: formatMoney(values.freespins, 'EUR'),
      endBalance: formatMoney(values.endBalance, 'EUR'),
      rawStartBalance: values.startBalance,
      rawDeposits: values.deposits,
      rawWithdrawals: values.withdrawals,
      rawWins: values.wins,
      rawBets: values.bets,
      rawTurnToReal: values.turnToReal,
      rawCompensations: values.compensations,
      rawCorrections: values.corrections,
      rawFreespins: values.freespins,
      rawEndBalance: values.endBalance,
    });
  return result;
};
module.exports = { report };
