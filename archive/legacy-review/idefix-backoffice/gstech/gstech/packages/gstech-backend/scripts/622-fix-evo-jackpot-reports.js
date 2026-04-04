// @flow
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const moment = require('moment-timezone');
const { DateTime } = require('luxon');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');
const { hourStart, hourEnd } = require('../server/modules/reports/jobs/reporting-time');
const jpToFix = require('./assets/622-evo-jp-reporting.json');

type JpToFix = {
  id: string,
  startedAt: DateTime,
  gameProvider: 'netent' | 'redtiger',
  gameType: string,
  transactionId: string,
  currency: string,
  playerId: string,
  jackpotId: string,
  jackpotWinType: 'progressive' | 'fixed',
  totalPayout: number,
  jackpotPayout: number,
  normalPayout: number,
};

const fixHourlyReports = async (hour: Date, playerId: Id, tx: Knex$Transaction<any>) => {
  logger.debug(`Adjusting report_hourly_players for ${playerId} at ${hour.toISOString()}`);
  const query = `
    INSERT INTO report_hourly_players ("amount", "bonusAmount", "playerId", "type", "count", "hour")
      SELECT
        sum(amount) AS "amount",
        sum("bonusAmount") as "bonusAmount",
        "playerId",
        "type",
        count(*) AS "count",
        date_trunc('hour', '${hourStart(hour)}'::timestamp) AS "hour"
      FROM transactions
      WHERE "timestamp" BETWEEN '${hourStart(hour)}' and '${hourEnd(hour)}'
      AND "playerId" = ${playerId}
      GROUP BY "playerId", "type"`;
  await tx('report_hourly_players')
    .where({ playerId, hour: tx.raw(`date_trunc('hour', '${hourStart(hour)}'::timestamp)`) })
    .del();
  await tx.raw(query);
};

const fixDailyPlayerGameSummaryReports = async (
  hour: Date,
  playerId: Id,
  tx: Knex$Transaction<any>,
) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  logger.debug(`Ajusting report_daily_player_game_summary for ${playerId} at ${h}`);
  const query = `
    INSERT INTO report_daily_player_game_summary ("amount", "bonusAmount", "playerId", "type", "gameId", "manufacturerId", "count", "day")
      SELECT
        sum(amount) as "amount",
        sum("bonusAmount") as "bonusAmount",
        "playerId",
        "type",
        coalesce("game_rounds"."gameId", 100) as "gameId",
        coalesce("game_rounds"."manufacturerId", 'INT') as "manufacturerId",
        count("transactions"."id") as "count",
        date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') as "day"
      FROM transactions
      JOIN players ON "players"."id" = "transactions"."playerId"
      LEFT OUTER JOIN game_rounds ON transactions."gameRoundId"=game_rounds.id
        AND "game_rounds"."timestamp" between '${moment(hour)
          .startOf('month')
          .add(-2, 'month')
          .format('YYYY-MM-DDTHH:mm:ss.000000Z')}' and '${moment(hour)
    .endOf('month')
    .add(1, 'month')
    .format('YYYY-MM-DDTHH:mm:ss.999999Z')}'
      WHERE
        type in ('bet', 'win', 'cancel_bet', 'cancel_win', 'win_freespins', 'win_jackpot', 'win_local_jackpot')
        AND "transactions"."timestamp" between '${moment(hour)
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.000000Z')}' and '${moment(hour)
    .endOf('day')
    .format('YYYY-MM-DDTHH:mm:ss.999999Z')}'
        AND "transactions"."playerId" = ${playerId}
      GROUP BY "game_rounds"."gameId", "game_rounds"."manufacturerId", "playerId", "type"
  `;
  await tx('report_daily_player_game_summary')
    .where({ playerId, day: tx.raw(`date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')`) })
    .del();
  await tx.raw(query);
};

const fixDailyBrandsReports = async (hour: Date, brandId: string, tx: Knex$Transaction<any>) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  logger.debug(`Ajusting report_daily_brands for ${brandId} at ${h}`);
  const tsStart = moment(hour).startOf('day').format('YYYY-MM-DDTHH:mm:ss.000000Z');
  const tsEnd = moment(hour).endOf('day').format('YYYY-MM-DDTHH:mm:ss.999999Z');
  const query = `
    INSERT INTO report_daily_brands ("amount", "bonusAmount", "currencyId", "type", "brandId", "count", "day")
      SELECT
        sum(amount) as "amount",
        sum("bonusAmount") as "bonusAmount",
        "currencyId",
        "type",
        "brandId",
        count("transactions"."id") as "count",
        date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') as "day"
      FROM transactions
      JOIN players ON "players"."id" = "transactions"."playerId"
      WHERE "transactions"."timestamp" between '${tsStart}' and '${tsEnd}'
      AND "players"."brandId" = '${brandId}'
      GROUP BY "brandId", "currencyId", "type"
  `;
  await tx('report_daily_brands')
    .where({ brandId, day: tx.raw(`date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')`) })
    .del();
  await tx.raw(query);
};

const fixDailyGamesBrandsReports = async (
  hour: Date,
  brandId: string,
  tx: Knex$Transaction<any>,
) => {
  const h = moment(hour).format('YYYY-MM-DD HH:mm:ss');
  logger.debug(`Ajusting report_daily_games_brands for ${brandId} at ${h}`);
  const grTsStart = moment(hour)
    .startOf('day')
    .add(-2, 'month')
    .format('YYYY-MM-DDTHH:mm:ss.000000Z');
  const grTsEnd = moment(hour).endOf('day').add(1, 'month').format('YYYY-MM-DDTHH:mm:ss.999999Z');
  const txTsStart = moment(hour).startOf('day').format('YYYY-MM-DDTHH:mm:ss.000000Z');
  const txTsEnd = moment(hour).endOf('day').format('YYYY-MM-DDTHH:mm:ss.999999Z');
  const query = `
    INSERT INTO report_daily_games_brands ("amount", "bonusAmount", "currencyId", "type", "brandId", "gameId", "manufacturerId", "count", "day")
      SELECT
        sum(amount) as "amount",
        sum("bonusAmount") as "bonusAmount",
        "currencyId",
        "type",
        "brandId",
        coalesce("game_rounds"."gameId", 100) as "gameId",
        coalesce("game_rounds"."manufacturerId", 'INT') as "manufacturerId",
        count("transactions"."id") as "count",
        date_trunc('day', '${h}' AT TIME zone 'Europe/Rome') as "day"
      FROM transactions
      JOIN players ON "players"."id" = "transactions"."playerId"
      LEFT OUTER JOIN game_rounds ON transactions."gameRoundId"=game_rounds.id
        AND "game_rounds"."timestamp" between '${grTsStart}' and '${grTsEnd}'
      WHERE type in ('bet', 'win', 'cancel_bet', 'cancel_win', 'win_freespins', 'win_jackpot', 'win_local_jackpot')
        AND "transactions"."timestamp" between '${txTsStart}' and '${txTsEnd}'
        AND "players"."brandId" = '${brandId}'
      GROUP BY "game_rounds"."gameId", "game_rounds"."manufacturerId", "brandId", "currencyId", "type"
  `;
  await tx('report_daily_games_brands')
    .where({ brandId, day: tx.raw(`date_trunc('day', '${h}' AT TIME zone 'Europe/Rome')`) })
    .del();
  await tx.raw(query);
};

(async (startOffset: ?string, numRec: ?string) => {
  const limit = promiseLimit(1);
  const groupOperationResults = (opR: Array<<T = string>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => _.slice(b, 1).join(':')))
      .value();

  const jpToFixFiltered = _.map<Object, JpToFix>(jpToFix, ({ startedAt, ...rest }) => ({
    ...rest,
    startedAt: DateTime.fromISO(startedAt),
  })).filter(({ startedAt }) => startedAt.monthLong === 'May');

  const start = +startOffset || 0;
  const end = start + (+numRec || jpToFixFiltered.length - start);
  const targets = _.slice(jpToFixFiltered, start, end);
  logger.info(`Processing ${targets.length}/${jpToFix.length} records from pos ${start}`);
  const operations = targets.map(
    (r) =>
      async (record: typeof r = r): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          const { playerId: evoPlayerId, transactionId, normalPayout, jackpotPayout } = record;
          const [brandId, playerIdFromEvo] = evoPlayerId.split('_');
          const playerId = +playerIdFromEvo;
          try {
            const rows = await tx('transactions')
              .select()
              .where({
                playerId,
                manufacturerId: 'EVO',
                externalTransactionId: `C${transactionId}`
              });
            if (rows.length === 0) return `NF:${evoPlayerId}:${transactionId}`;
            const txAlreadyFixed = _.some(rows, {
              type: 'win_jackpot',
              amount: _.round(jackpotPayout),
            });
            if (rows.length > 1) {
              if (!txAlreadyFixed) {
                logger.warn(`!!! 622 expected 1 row got ${rows.length}`, { record, rows });
                return `ERR:${evoPlayerId}:${transactionId}`;
              }
              logger.info(`+++ 622 already fixed`, { record });
              return `OK:${evoPlayerId}:${transactionId}`;
            }
            const [{ id: txId, ...transaction }] = rows;
            if (!transaction) return `ERR:${evoPlayerId}:${transactionId}`;
            await tx('transactions')
              .where({ id: txId })
              .update({
                amount: normalPayout,
                balance: Math.max(0, transaction.balance - jackpotPayout),
              });
            await tx('transactions').insert({
              ...transaction,
              amount: jackpotPayout,
              type: 'win_jackpot',
              subTransactionId: 1,
            });
            const { timestamp: txTs } = transaction;
            await fixHourlyReports(moment(txTs), +playerId, tx);
            await fixDailyPlayerGameSummaryReports(moment(txTs), +playerId, tx);

            await fixDailyBrandsReports(moment(txTs), brandId, tx);
            await fixDailyGamesBrandsReports(moment(txTs), brandId, tx);

            logger.info('+++ 622', { transaction });
            return `OK:${evoPlayerId}:${transactionId}`;
          } catch (error) {
            logger.error('XXX 622', { error, record });
            return `ERR:${evoPlayerId}:${transactionId}`;
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
