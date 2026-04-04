// @flow
import type { PlayerWithBalance } from 'gstech-core/modules/clients/backend-wallet-api';
import type { ConversionRate } from 'gstech-core/modules/types/backend';

const _ = require('lodash');
const promiseLimit = require('promise-limit');
const logger = require('gstech-core/modules/logger');
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const { Money: MoneyClass } = require('gstech-core/modules/money-class');
const { getCurrentRates } = require('../server/modules/settings/ConversionRates');
const { getBalance } = require('../server/modules/players');
const { doMaintenance } = require('../server/modules/bonuses');
const Payment = require('../server/modules/payments/Payment');
const balsToClear = require('./assets/595-Monthly-balance-deduction.json');

const getRecentTransactions = async (
  username: string,
  tx: Knex$Transaction<any>,
): Promise<?{ message: string, timestamp: Date }> =>
  tx('payment_event_logs')
    .leftJoin('payments', 'payments.id', 'payment_event_logs.paymentId')
    .leftJoin('players', 'players.id', 'payments.playerId')
    .first('message', 'payment_event_logs.timestamp')
    .where({ 'players.username': username })
    .where('payment_event_logs.timestamp', '>', pg.raw(`date_trunc('month', now())`));

(async (startOffset: ?string, numRec: ?string) => {
  const limit = promiseLimit(25);
  const groupOperationResults = (opR: Array<<T = string>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => _.slice(b, 1).join(':')))
      .value();
  const start = +startOffset || 0;
  const end = start + (+numRec || balsToClear.length - start);
  const targets = _.slice(balsToClear, start, end);
  logger.info(`Processing ${targets.length}/${balsToClear.length} records from pos ${start}`);
  const currentRates = await getCurrentRates();
  const operations = targets.map(
    (r) =>
      async (
        record: { username: string, deduct: number | string } = r,
        rates: ConversionRate[] = currentRates,
      ): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          const asCurrency = (amount: number, to: ConversionRate['currencyId']) =>
            amount * (rates.find(({ currencyId }) => currencyId === to)?.conversionRate || 0);
          const { username, deduct } = record;
          try {
            const player: PlayerWithBalance = await tx('players')
              .first(['id', 'balance', 'currencyId'])
              .where({ username });
            if (!player) {
              logger.warn(`!!! bulkDeduct: ${username} not found`);
              return `NF:${username}`;
            }
            const { id: playerId, balance: currBal, currencyId } = player;
            const message = `deduction made in accordance with t&c clause 15.3`;
            const recentTransaction = await getRecentTransactions(username, tx);
            if (recentTransaction) {
              const { message: lastTxMsg, timestamp } = recentTransaction;
              if (
                (lastTxMsg !== null && lastTxMsg.endsWith(message)) ||
                DateTime.fromJSDate(timestamp).hasSame(DateTime.local(), 'month')
              ) {
                const ts = timestamp.toISOString();
                logger.warn(`!!! bulkDeduct: ${username} prev deducted [${ts}]`);
                return `OK:${username}`;
              }
            }
            const deductCurrency = _.ceil(asCurrency(+deduct, currencyId) * 100);
            const valueToDeduct = deductCurrency > currBal ? currBal : deductCurrency;
            if (deductCurrency !== valueToDeduct)
              logger.info(`!!! bulkDeduct: ${username} ${valueToDeduct} > ${deductCurrency} `);
            const deductMoney = new MoneyClass(valueToDeduct, currencyId);
            await doMaintenance(playerId, tx);
            await Payment.addTransaction(
              playerId,
              null,
              'correction',
              -valueToDeduct,
              `${deductMoney.asFloat()}${currencyId} ${message}`,
              null,
              tx,
            );
            const { balance } = await getBalance(player.id).transacting(tx);
            logger.info(`+++ bulkDeduct ${username} (${currencyId})`, {
              deductEUR: (+deduct).toFixed(2),
              deductCurrency,
              valueToDeduct,
              prevBal: currBal,
              newBal: balance,
            });
            return `OK:${username}`;
          } catch (e) {
            logger.error(`XXX bulkDeduct ${username}`, { error: e });
            return `ERR:${username}`;
          }
        }),
  );
  const results = groupOperationResults(
    await Promise.all(operations.map((operation) => limit(() => operation()))),
  );
  const summary = { ok: results.OK?.length, err: results.ERR || 0, nf: results.NF || 0 };
  logger.info('Done', { summary });
  process.exit(0);
})(..._.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2));
