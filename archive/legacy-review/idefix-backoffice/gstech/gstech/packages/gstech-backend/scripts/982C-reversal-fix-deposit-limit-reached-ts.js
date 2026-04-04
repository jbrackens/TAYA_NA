/* @flow */

const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addNote } = require('../server/modules/players/PlayerEvent');

const ddCorrections = require('./assets/982-C-deposit-limit-reached-reversal.json');

type DDReversal = { pid: Id, ts: ?number };

(async (startOffset: ?string, numRec: ?string, concurrency: ?string) => {
  const plimit = Math.max(+concurrency || 1, 1);
  const limit = promiseLimit(plimit);
  logger.info(`Promise limit: ${plimit}`)
  const groupOperationResults = (opR: Array<<T = string>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => _.slice(b, 1).join(':')))
      .value();
  const start = +startOffset || 0;
  const end = start + (+numRec || ddCorrections.length - start);
  const targets = _.slice(ddCorrections, start, end);
  logger.info(`Processing ${targets.length}/${ddCorrections.length} records from pos ${start}`);
  const operations = targets.map(
    (r, i, a) =>
      async (record: DDReversal = r, idx: number = i, arr: Array<DDReversal> = a): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          const { pid: playerId, ts: prevTsEpoch } = record;
          const progress = (idx / arr.length) * 100;
          const logPrefix = `+++ 982C [${progress.toFixed(2)}% (${idx})] ${playerId}`;
          try {
            const prevTs = prevTsEpoch ? new Date(prevTsEpoch) : null;
            const toReverse = await tx('players')
              .first({ pId: 'id', currTs: 'depositLimitReached' })
              .where({ id: playerId })
              .whereRaw(`"depositLimitReached" is distinct from ?`, [prevTs]);

            if (!toReverse) {
              logger.info(`${logPrefix} SKIP`);
              return `OK:${playerId}`;
            }

            const { pId, currTs } = toReverse;
            const tsUpdateStr = `${currTs.toISOString()} -> ${prevTs?.toISOString() || 'NULL'}`;
            logger.debug(`${logPrefix} [${pId}] ${tsUpdateStr}`);
            await tx('players').update({ depositLimitReached: prevTs }).where({ id: pId });
            let noteContent = `IDXD-982C - REVERSAL
              Undoing Previous Correction of Deposit Limit Reached Timestamp
              ${tsUpdateStr}`;
            if (!prevTs) {
              const mistakenFraud = await tx('player_frauds')
                .first('id')
                .where({ playerId: pId, fraudKey: 'deposit_limit_reached' });
              if (mistakenFraud) {
                await tx('player_events')
                  .where({ playerId: pId, fraudId: mistakenFraud.id })
                  .whereRaw(`"createdAt" > now() - interval '3 days'`)
                  .del();
                await tx('player_frauds')
                  .where({ playerId: pId, fraudKey: 'deposit_limit_reached' })
                  .del();
                noteContent += `\nRemoved 'deposit_limit_reached' fraud (id: ${mistakenFraud.id})`;
              }
            }
            await addNote(pId, null, noteContent, tx);

            logger.info(`${logPrefix} DONE`);
            return `OK:${playerId}`;
          } catch (error) {
            logger.error(`${logPrefix} ERROR`, error);
            return `ERR:${playerId}`;
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
