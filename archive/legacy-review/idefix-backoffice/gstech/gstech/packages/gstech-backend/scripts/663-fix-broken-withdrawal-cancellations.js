// @flow
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');

const transactions = require('../server/modules/transactions');
const Payment = require('../server/modules/payments/Payment');

(async () => {
  const limit = promiseLimit(1);
  const groupOperationResults = (opR: Array<<T = string>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => _.slice(b, 1).join(':')))
      .value();
  // WD transactionIds that must be cancelled
  const targets = [10000056757, 10000041427, 10000034133, 10000027876, 10000027849];
  const operations = targets.map(
    (t) =>
      async (wdTxId: Id = t): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          try {
            const mistakenCancel = await tx('transactions')
              .first('id', 'playerId', 'type', 'amount')
              .where({ targetTransactionId: wdTxId })
              .orderBy('timestamp', 'desc');
            if (!mistakenCancel) return `ERR:${wdTxId}`;
            const { playerId, amount: balToClear } = mistakenCancel;
            await Payment.addTransaction(
              playerId,
              null,
              'correction',
              -1 * balToClear,
              `IDXD-663 - Reverting failed WD cancellation`,
              null,
              tx,
            );
            await tx('transactions').where({ id: mistakenCancel.id }).del()
            const id = await transactions.cancelTransaction(wdTxId, null, tx);
            if (!id) return `NF:${wdTxId}`;
            return `OK:${id}`;
          } catch (error) {
            logger.error(`XXX 663 ${wdTxId}`, { error });
            return `ERR:${wdTxId}`;
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
