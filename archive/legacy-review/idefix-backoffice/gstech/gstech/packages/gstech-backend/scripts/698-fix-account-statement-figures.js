// @flow

const _ = require('lodash');
const { DateTime } = require('luxon');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');

const args = _.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2);
const monthArg = _.first(
  _.filter(
    args,
    (a) =>
      DateTime.fromFormat(a, 'yyyy-M').isValid ||
      DateTime.fromFormat(`2023-${a}`, 'yyyy-M').isValid,
  ),
);

const monthTz = (m: string) => `date_trunc('month', '${m}' at time zone 'Europe/Rome')`;

(async (dryRun: boolean = false, month: ?string = null): Promise<?any> => {
  const logPrefix = `FIX ACCOUNT STATEMENT FIGURES${dryRun ? ' [DRY RUN]' : ''}`;
  if (!month) throw Error('No Month Provided');
  const mDate = DateTime.fromFormat(month, 'yyyy-M').isValid
    ? DateTime.fromFormat(month, 'yyyy-M')
    : DateTime.fromFormat(`2023-${month}`, 'yyyy-M');
  const h = mDate.plus({ months: 1 }).set({ hour: 5, minutes: 4 }).toISO();
  logger.info(`${logPrefix} FIXING MONTH`, `${month}`, `${h}`);
  const trxProvider = pg.transactionProvider();
  const trx = await trxProvider();
  try {
    const {
      rows: [{ updated, deleted }],
    } = await trx.raw(`
    with last_transactions as (
      SELECT * from (
          SELECT
            "id",
            "playerId",
            "reservedBalance",
            "balance",
            "bonusBalance",
            row_number() over (partition by transactions."playerId" order by "timestamp" desc, "id" desc) r
          FROM transactions
          WHERE
            transactions.timestamp BETWEEN
            ${monthTz(h)} - interval '1 month'
          AND ${monthTz(h)} - interval '1 usec'
      ) tx WHERE tx.r=1
    ),
    fixed_statement AS (
      SELECT r.*, now() FROM (
        SELECT DISTINCT ON ("players"."id")
          "players"."id" AS "playerId",
          ${monthTz(h)} AS month,
          coalesce("transactions"."reservedBalance", min(p."reservedBalance"), 0) AS "reservedBalance",
          coalesce("transactions"."balance", min(p."balance"), 0) AS "balance",
          coalesce("transactions"."bonusBalance", min(p."bonusBalance"), 0) AS "bonusBalance"
        FROM players
        LEFT OUTER JOIN last_transactions as transactions ON "transactions"."playerId" = "players"."id"
        LEFT OUTER JOIN account_statements p
          ON p."playerId" = "players"."id"
          AND p."month" = ${monthTz(h)} - interval '1 month'
        WHERE "testPlayer" = false
        GROUP BY "players"."id", "transactions"."id", "transactions"."balance", "transactions"."bonusBalance", "transactions"."reservedBalance"
        ORDER BY "players"."id", "transactions"."id" DESC
      ) r WHERE r.balance > 0 OR r."bonusBalance" > 0 OR r."reservedBalance" > 0
    ),
    update_fixes AS (
      INSERT INTO account_statements ("playerId", "month", "reservedBalance", "balance", "bonusBalance", "updatedAt")
        SELECT * FROM fixed_statement
        ON CONFLICT ("playerId", "month")
        DO UPDATE
        SET "reservedBalance" = EXCLUDED."reservedBalance",
            "balance" = EXCLUDED."balance",
            "bonusBalance" = EXCLUDED."bonusBalance",
            "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "playerId"
    ),
    delete_fixes AS (
      DELETE FROM account_statements
      WHERE "month" = ${monthTz(h)}
      AND "playerId" NOT IN (SELECT "playerId" FROM fixed_statement)
      RETURNING "playerId"
    ),
    fixed_updates AS (SELECT array_agg(u."playerId") "playerIds" FROM update_fixes u),
    fixed_deletes AS (SELECT array_agg(d."playerId") "playerIds" FROM delete_fixes d)
    SELECT
      fixed_updates."playerIds" "updated",
      fixed_deletes."playerIds" "deleted"
    FROM fixed_updates, fixed_deletes`);

    const result = {
      updated,
      deleted,
      updatedCount: updated?.length || 0,
      deletedCount: deleted?.length || 0,
    };

    if (dryRun) {
      logger.info(`+++ ROLLBACK ${logPrefix}`, result);
      return await trx.rollback();
    }
    logger.info(`+++ COMMIT ${logPrefix}`, result);
    return await trx.commit();
  } catch (e) {
    logger.error(`XXX ${logPrefix}`, { e, message: e.message, stack: e.stack });
    if (!trx.isCompleted()) await trx.rollback();
    throw e;
  }
})(args.includes('-d'), monthArg)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
