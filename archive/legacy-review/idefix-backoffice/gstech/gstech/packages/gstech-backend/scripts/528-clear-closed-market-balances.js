// @flow
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');
const { getBalance } = require('../server/modules/players');
const { doMaintenance } = require('../server/modules/bonuses');
const Payment = require('../server/modules/payments/Payment');
const balsToClear = require('./assets/528-closed-market-balances-to-clear.json');

(async (startOffset: ?string, numRec: ?string) => {
  const limit = promiseLimit(10);
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
  const operations = targets.map(
    (r) =>
      async (record: any = r): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          const { username, ...rest } = record;
          try {
            const player = await tx('players').first(['id', 'balance']).where({ username });
            if (!player) {
              logger.warn(`!!! 528 ${username} not found`);
              return `NF:${username}`;
            }
            const balToClear = +rest['Balance to remove'].replace(/,/g, '');
            const realBalanceCents = +rest.realBalanceCents.replace(/,/g, '');
            const expectedBal = realBalanceCents - Math.abs(balToClear);
            const { id: playerId, balance: currBal } = player;
            if (currBal === expectedBal) {
              logger.info(`+++ 528 ${username} already cleared`);
              return `OK:${username}`;
            }
            if (currBal !== realBalanceCents) {
              logger.warn(`!!! 528 ${username} balance mismatch`, { currBal, realBalanceCents });
              return `ERR:BM:${username}`;
            }
            await doMaintenance(playerId, tx);
            await Payment.addTransaction(
              playerId,
              null,
              'correction',
              balToClear,
              rest['Comment on account'],
              null,
              tx,
            );
            const { balance } = await getBalance(player.id).transacting(tx);
            logger.info(`+++ 528 ${username}`, { prevBal: currBal, newBal: balance, expectedBal });
            return `OK:${username}`;
          } catch (error) {
            logger.error(`XXX 528 ${username}`, { error });
            return `ERR:${username}`;
          }
        }),
  );
  const results = groupOperationResults(
    await Promise.all(operations.map((operation) => limit(() => operation()))),
  );
  const summary = { ok: results.OK?.length, err: results.ERR, nf: results.NF };
  logger.info('Done', { summary });
  process.exit(0);
})(..._.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2));
