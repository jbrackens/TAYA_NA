/* @flow */

const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { addNote } = require('../server/modules/players/PlayerEvent');

const ddCorrections = require('./assets/982-E-deposit-limit-reached-corrections.json');

type DDCorrection = {
  runId: Id,
  personId: ?Id,
  playerIds: Array<Id>,
  paymentId: Id,
  paymentTs: number,
  runTotal: string,
};

const processArgs = (args: Array<string>): Array<string> => {
  if (_.isNumber(args[0]) || !['fix', 'validate'].includes(args[0])) return ['fix', ...args];
  return args;
};

const doFix = async (
  record: DDCorrection,
  idx: number,
  arr: Array<DDCorrection>,
): Promise<string> =>
  pg.transaction(async (tx): Promise<string> => {
    const { runId, personId, playerIds, paymentId, paymentTs, runTotal } = record;
    const progress = (idx / arr.length) * 100;
    const logPrefix = `+++ 982E [${progress.toFixed(2)}% ${runId}(${playerIds.length})]`;
    try {
      const correctTs = new Date(paymentTs);
      const paymentExists = await tx('payments').where({ id: paymentId }).first();
      if (!paymentExists) {
        logger.info(`${logPrefix} NF`);
        return `NF:${runId}`;
      }
      const toUpdate = await tx('players')
        .select({ pId: 'id', oldTs: 'depositLimitReached' })
        .whereIn('id', playerIds)
        .whereRaw(`"depositLimitReached" is distinct from ?`, [correctTs]);

      if (_.isEmpty(toUpdate)) {
        logger.info(`${logPrefix} SKIP`);
        return `OK:${runId}`;
      }
      logger.info(`${logPrefix} UPDATE:${toUpdate.length}`);

      for (const { pId, oldTs } of toUpdate) {
        const tsUpdateStr = `${oldTs?.toISOString() || '-'} -> ${correctTs.toISOString()}`;
        logger.debug(`${logPrefix} [${pId}] ${tsUpdateStr}`);
        await tx('players').update({ depositLimitReached: correctTs }).where({ id: pId });
        const noteContent = `IDXD-982E - Corrected Deposit Limit Reached Timestamp (V2)
            ${tsUpdateStr}
            (paymentId: ${paymentId}, runTotal: €${runTotal}, personId: ${personId || '-'})`;
        await addNote(pId, null, noteContent, tx);
      }

      logger.info(`${logPrefix} [DONE]`);
      return `OK:${runId}`;
    } catch (error) {
      logger.error(`${logPrefix} [ERROR]`, error);
      return `ERR:${runId}`;
    }
  });

const doValidate = async (
  record: DDCorrection,
  idx: number,
  arr: Array<DDCorrection>,
): Promise<string> =>
  pg.transaction(async (tx): Promise<string> => {
    const { runId, personId, playerIds, paymentId, runTotal } = record;
    const progress = (idx / arr.length) * 100;
    const logPrefix = `+++ 982E (VALIDN) [${progress.toFixed(2)}% ${runId}(${playerIds.length})]`;
    try {
      const cBrk = await tx('payments')
        .first({
          ts: 'timestamp',
          amount: pg.raw('amount/monthly_conversion_rates."conversionRate"'),
        })
        .leftJoin('players', 'players.id', 'payments.playerId')
        .innerJoin('monthly_conversion_rates', (qb) =>
          qb
            .on('players.currencyId', 'monthly_conversion_rates.currencyId')
            .on(
              'monthly_conversion_rates.month',
              pg.raw(`date_trunc('month', payments."timestamp")`),
            ),
        )
        .where({ 'payments.id': paymentId });
      if (!cBrk) {
        logger.info(`${logPrefix} SKIP`);
        return `OK:${runId}`;
      }
      const {
        rows: [cSum],
      } = await tx.raw(
        `
      select SUM(py."amount"/mc."conversionRate") "sumAsAt"
      from payments py
      left join players p on p.id = py."playerId"
      inner join monthly_conversion_rates mc on p."currencyId" = mc."currencyId" and mc.month = date_trunc('month', py."timestamp")
      where py."paymentType" = 'deposit'
      AND ("py"."status" = 'complete' OR ("py"."status" = 'pending' and "py"."timestamp" > now() - interval '180 days'))
      AND py."timestamp" <= ((?::timestamptz) + interval '1 sec')
      AND py."playerId" in (${playerIds.map(() => '?').join(',')})
      limit 1;
    `,
        [cBrk.ts, ...playerIds],
      );
      const runT = _.round(+runTotal * 100);
      const sumT = cSum.sumAsAt;
      const diff = Math.abs(_.round(runT - sumT));
      const ref = _.castArray(personId || playerIds);
      const sumPrev = sumT - cBrk.amount;
      const sumMsg = `${sumPrev} (+${cBrk.amount}) => ${sumT}`;
      if (diff >= 100 || sumPrev >= 200000 || sumT < 200000) {
        logger.error(`${logPrefix} (${ref.join(',')}) ${diff}`, sumMsg);
        return `ERR:${runId}`;
      }
      logger.info(`${logPrefix} (${ref.join(',')}) ${diff}`, sumMsg);
      return `OK:${runId}`;
    } catch (error) {
      logger.error(`${logPrefix} [ERROR]`, error);
      return `ERR:${runId}`;
    }
  });

(async (cmd: ?string, startOffset: ?string, numRec: ?string, concurrency: ?string) => {
  const plimit = Math.max(+concurrency || 1, 1);
  const limit = promiseLimit(plimit);
  logger.info(`Promise limit: ${plimit}`);
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
      async (record: DDCorrection = r, idx: number = i, arr: Array<DDCorrection> = a) =>
        cmd === 'validate' ? doValidate(record, idx, arr) : doFix(record, idx, arr),
  );
  const results = groupOperationResults(
    await Promise.all(operations.map((operation) => limit(() => operation()))),
  );
  const summary = { ok: results.OK?.length, err: results.ERR, nf: results.NF };
  logger.info('Done', { summary, counts: _.mapValues(results, (a) => a?.length || 0) });
  process.exit(0);
})(...processArgs(_.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2)));

/**
 * SQL THAT GENERATED THE JSON:
 *
    WITH "running_sum" AS (
      SELECT COALESCE(p."personId", py."playerId") AS "runId",
        "p"."personId" AS "personId",
        "py"."timestamp" AS "paymentTs",
        "py"."id" AS "paymentId",
        "py"."amount" AS "paymentAmount",
        CASE
          when p."personId" is not null
          then SUM(py."amount" / mc."conversionRate") OVER ( PARTITION BY p."personId" ORDER BY py."timestamp")
          else SUM(py."amount" / mc."conversionRate") OVER ( PARTITION BY p."id" ORDER BY py."timestamp")
        END
        AS "runTotal"
      FROM "payments" AS "py"
        LEFT JOIN "players" AS "p" ON "p"."id" = "py"."playerId"
        INNER JOIN "monthly_conversion_rates" AS "mc" ON "p"."currencyId" = "mc"."currencyId"
        AND "mc"."month" = date_trunc ('month', py."timestamp")
      WHERE "py"."paymentType" = 'deposit'
        AND (
          "py"."status" = 'complete'
          OR ("py"."status" = 'pending' and "py"."timestamp" > now() - interval '180 days')
        )
    ),
    "dd_threshold" AS (
      SELECT DISTINCT ON ("runId", "personId") "runId",
        "personId",
        "paymentId",
        "paymentTs",
        "paymentAmount",
        TO_CHAR("runTotal" / 100.0, 'FM999999999D00') AS "runTotal"
      FROM "running_sum"
      WHERE "runTotal" >= 200000
      ORDER BY "runId" ASC, "personId" ASC,
        "paymentTs" ASC
    )
    SELECT dd."runId",
      dd."personId",
      json_agg(p."id") AS "playerIds",
      dd."paymentId",
      extract (epoch from dd."paymentTs") * 1000 "paymentTs",
      dd."runTotal"
    FROM "dd_threshold" dd
      LEFT JOIN players p ON (
        dd."personId" IS NOT NULL
        AND p."personId" = dd."personId"
      )
      OR (
        dd."personId" IS NULL
        AND p."id" = dd."runId"
      )
    GROUP BY dd."runId",
      dd."personId",
      dd."paymentId",
      dd."paymentTs",
      dd."runTotal";
 */
