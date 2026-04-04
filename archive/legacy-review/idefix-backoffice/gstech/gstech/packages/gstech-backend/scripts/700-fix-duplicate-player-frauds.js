// @flow

const _ = require('lodash');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');

const args = _.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2);

const groupOperationResults = (opR: string[]) => {
  const groupResults = (arr: string[]): any => {
    if (arr[0].length === 1) return _.map<string, any>(arr, (a) => a[0]);
    return _.chain(arr)
      .groupBy((a) => a[0])
      .mapValues((b) => groupResults(_.map<string[], any>(b, (c) => _.tail(c))))
      .value();
  };
  const countResults = (grouped: { [key: string]: any[] | { ... } }): { [key: string]: number } =>
    _.mapValues(grouped, (value) => (_.isArray(value) ? value.length : countResults(value)));
  const results = _.chain(opR)
    .map((s) => s.split(':'))
    .thru((r) => groupResults(r))
    .value();
  return { results, counts: countResults(results) };
};

(async (slice: ?string = null): Promise<any> => {
  const fraudKeysToFix = [
    'cumulative_deposits_5k',
    'cumulative_deposits_10k',
    'cumulative_deposits_25k',
    'dep500_acc30days',
    'dep1000_acc60days',
    'dep2500_acc90days',
  ];
  const opResults = [];
  let opId = 1;
  const logPrefix = (o: number = opId): string => `IDXD700 FIX:${o}`;
  while (!slice || opId <= +slice) {
    logger.info(`>>> ${logPrefix()}:START`);
    const ret = await pg.transaction(async (tx): Promise<string> => {
      const opData = await tx
        .with(
          'orig',
          pg('player_frauds')
            .select('playerId', 'fraudKey')
            .min({ createdAt: 'createdAt' })
            .whereIn('fraudKey', fraudKeysToFix)
            .groupBy('playerId', 'fraudKey'),
        )
        .with(
          'jobs',
          pg('orig')
            .min({
              firstTs: 'pf.createdAt',
              lastTs: 'pf.createdAt',
            })
            .count({ count: 'pf.id' })
            .select({
              id: pg.raw('min(pf.id) filter (where pf."createdAt" = orig."createdAt")'),
              playerId: 'orig.playerId',
              fraudKey: 'orig.fraudKey',
              delIds: pg.raw('array_agg(pf.id) filter (where pf."createdAt" != orig."createdAt")'),
            })
            .leftJoin('player_frauds as pf', (qb) =>
              qb.on('pf.playerId', 'orig.playerId').on('pf.fraudKey', 'orig.fraudKey'),
            )
            .groupBy('orig.playerId', 'orig.fraudKey'),
        )
        .first({
          id: 'j.id',
          playerId: 'j.playerId',
          delIds: 'j.delIds',
          firstTs: 'j.firstTs',
          delCount: pg.raw('coalesce(array_length(j."delIds", 1),0)'),
        })
        .from({ j: 'jobs' })
        .leftJoin('player_frauds as pf', 'pf.id', 'j.id')
        .whereNot((qb) =>
          qb.where({
            'j.count': 1,
            'pf.fraudId': pg.raw('CAST(pf."playerId" AS text)'),
          }),
        )
        .orderBy('j.count', 'desc');
      if (!opData) return 'END';
      const { id: updateId, delIds, delCount, firstTs, playerId } = opData;
      try {
        if (delCount > 0) {
          const delEvt = await tx('player_events')
            .where('playerId', playerId)
            .where('createdAt', '>=', firstTs)
            .whereIn('fraudId', delIds)
            .del()
            .returning('id');
          const delFrd = await tx('player_frauds')
            .where('playerId', playerId)
            .where('createdAt', '>=', firstTs)
            .whereIn('id', delIds)
            .del()
            .returning('id');
          const deleted = {
            events: _.map<{ id: string }, string>(delEvt, 'id'),
            frauds: _.map<{ id: number }, number>(delFrd, 'id'),
          };
          logger.debug(`+++ ${logPrefix()}:DEL`, `(${playerId})`, { deleted });
        }
        const [updatedFraud] = await tx('player_frauds')
          .where({ id: updateId })
          .update({ fraudId: pg.raw('player_frauds."playerId"') })
          .returning(['id', 'playerId', 'fraudId', 'fraudKey', 'createdAt']);
        logger.debug(`+++ ${logPrefix()}:UPD (${playerId})`, { updatedFraud });
        return `OK:${playerId}-${updatedFraud.id}`;
      } catch (err) {
        logger.error(`XXX ${logPrefix()}:UPD (${playerId})`, {
          err,
          msg: err.message,
          stack: err.stack,
        });
        return `ERR:${updateId}-${err.message}`;
      }
    });
    logger.info(`<<< ${logPrefix()}:END`);
    if (ret === 'END') break;
    opResults.push(ret);
    opId += 1;
  }
  const results = groupOperationResults(opResults);
  logger.info(`+++ ${logPrefix()} DONE`, { results });
  return results;
})(_.first(_.filter(args, (a) => _.isFinite(+a))))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
