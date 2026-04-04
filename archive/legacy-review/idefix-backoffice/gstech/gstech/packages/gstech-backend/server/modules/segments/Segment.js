/* @flow */
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const Notification = require('../core/notifications');
const { brands } = require('../../../config');

const limit = promiseLimit(2);

const updateSegment = async (brandId: string, playerId: ?Id, segment: string, updates: Id[], query: ((tx: Knex) => Knex$QueryBuilder<any>)) => {
  const s = await pg('segments').first('id').where({ brandId, name: segment });
  if (s != null) {
    const { id: segmentId } = s;
    await pg.transaction(async (tx) => {
      const { rows: [{ counter }] } = await tx.raw('select nextval(\'segment_round_seq\') as counter');

      const sql = query(tx)
        .where({ 'players.brandId': brandId })
        .modify((q) => playerId != null ?q.where('players.id', playerId) : q)
        .select(pg.raw('distinct players.id'))
        .toString();
      const { rows: inserted } = await tx.raw(`
        WITH updated as (
          INSERT INTO player_segments
          ("playerId", "segmentId", "insertCounter", "updateCounter")
          (SELECT "id", ${segmentId}, ${counter}, ${counter} FROM (${sql}) p)
          ON conflict("playerId", "segmentId")
          DO UPDATE SET "updateCounter"=${counter}
          RETURNING "playerId", "insertCounter","updateCounter"
        )
        select "playerId" from updated where "insertCounter"="updateCounter"`);

      const deleted = await tx('player_segments')
        .where({ segmentId })
        .modify((q) => playerId != null ?q.where('playerId', playerId) : q)
        .whereNot('updateCounter', counter)
        .del()
        .returning('playerId');
      logger.debug('updateSegment', brandId, playerId, segment, deleted.length, inserted.length);
      updates.push(...deleted.map((x) => +x.playerId));
      updates.push(...inserted.map((x) => +x.playerId));
    });
  }
};

const depositQuery = (tx: Knex, amount: Money, deposits: number): Knex$QueryBuilder<any> =>
  tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
    .where('players.numDeposits', '>=', deposits)
    .groupBy('players.id')
    .having(pg.raw('sum(payments.amount / base_currencies."defaultConversion")'), '>=', amount * 100);

const cumulativeDepositQuery = (tx: Knex, minAmount: Money, maxAmount?: Money): Knex$QueryBuilder<any> => {
  let query = tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
    .where('players.numDeposits', '>', 0)
    .groupBy('players.id')
    .having(pg.raw('sum(payments.amount / base_currencies."defaultConversion")'), '>=', minAmount * 100);
  if (maxAmount) {
    query = query.having(pg.raw('sum(payments.amount / base_currencies."defaultConversion")'), '<', maxAmount * 100);
  }
  return query;
};

const activeDepositQuery = (tx: Knex, minAmount: Money, maxAmount?: Money): Knex$QueryBuilder<any> => {
  let query = tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
    .where('players.numDeposits', '>', 0)
    .where(pg.raw('payments.timestamp > now() - \'50 days\'::interval'))
    .where(pg.raw('payments.amount / base_currencies."defaultConversion"'), '>=', minAmount * 100);
  if (maxAmount) {
    query = query.where(pg.raw('payments.amount / base_currencies."defaultConversion"'), '<', maxAmount * 100);
  }
  return query.groupBy('players.id');
};

const activeCumulativeDepositQuery = (tx: Knex, minAmount: Money, maxAmount?: Money): Knex$QueryBuilder<any> => {
  let query = tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
    .where(pg.raw('payments.timestamp > now() - \'50 days\'::interval'))
    .where('players.numDeposits', '>', 0)
    .groupBy('players.id')
    .having(pg.raw('sum(payments.amount / base_currencies."defaultConversion")'), '>=', minAmount * 100);
  if (maxAmount) {
    query = query.having(pg.raw('sum(payments.amount / base_currencies."defaultConversion")'), '<', maxAmount * 100);
  }
  return query;
};

const lastDepositQuery = (tx: Knex, minAmount: Money, maxAmount: Money): Knex$QueryBuilder<any> =>
  tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', (qb) =>
      qb
        .on('payments.playerId', 'players.id')
        .on('payments.paymentType', pg.raw('?', 'deposit'))
        .onIn('payments.status', ['complete', 'pending'])
        .on('payments.index', pg.raw('(players."numDeposits" - 1)')),
    )
    .where(pg.raw('payments.amount / base_currencies."defaultConversion"'), 'BETWEEN', [
      minAmount * 100,
      maxAmount * 100,
    ])
    .groupBy('players.id');


const singleDepositQuery = (tx: Knex, amount: Money, days?: number): Knex$QueryBuilder<any> =>
  tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
    .where(pg.raw('payments.amount / base_currencies."defaultConversion"'), '>=', amount * 100)
    .modify((t) => days != null ? t.where(pg.raw(`payments.timestamp > now() - '${days} days'::interval`)) : t)
    .groupBy('players.id');

const rtpQuery = (tx: Knex, operator: string, value: any) =>
  tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('sessions', 'sessions.playerId', 'players.id')
    .leftOuterJoin('payments as withdrawals', (qb) =>
      qb
        .on('withdrawals.playerId', 'players.id')
        .on('withdrawals.paymentType', pg.raw('?', 'withdraw'))
        .onIn('withdrawals.status', ['complete', 'pending']),
    )
    .innerJoin('payments as deposit', (qb) =>
      qb
        .on('deposit.playerId', 'players.id')
        .on('deposit.paymentType', pg.raw('?', 'deposit'))
        .onIn('deposit.status', ['complete', 'pending'])
        .on('deposit.index', pg.raw('(players."numDeposits" - 1)')),
    )
    .innerJoin('sessions as depositSession', (qb) =>
      qb.on('depositSession.playerId', 'players.id').on('deposit.sessionId', 'depositSession.id'),
    )
    .whereNull('withdrawals.id')
    .whereRaw('sessions.timestamp >= "depositSession".timestamp')
    .whereRaw(
      '(balance + "bonusBalance" + "reservedBalance") < 100 * base_currencies."defaultConversion"',
    )
    .groupBy('players.id')
    .having(
      pg.raw(
        '100 * (sum(sessions."realWin" + sessions."bonusWin") / (1 + sum(sessions."realBet" + sessions."bonusBet")))',
      ),
      operator,
      value,
    );

const promotionWageringBetween = (promotion: string, min: number, max: number) => (tx: Knex) =>
  tx('players')
    .innerJoin('base_currencies', 'players.currencyId', 'base_currencies.id')
    .innerJoin('player_counters', 'players.id', 'player_counters.playerId')
    .innerJoin('promotions', 'player_counters.promotionId', 'promotions.id')
    .where({
      'promotions.name': promotion,
      'promotions.active': true,
    })
    .where('numDeposits', '>=', 3)
    .whereBetween(pg.raw('player_counters.amount/base_currencies."defaultConversion"'), [min, max - 1]);

const levelWager = [3000, 10000, 50000, 100000, 200000, 500000, 1000000, 100000000, Number.MAX_SAFE_INTEGER/100].map(w => w * 100);

const doUpdatePlayersActivitySegments = async (brandId: string, updates: Id[] = []) => {
  const segments = await pg('segments')
    .select('id', 'name')
    .where({ brandId })
    .whereIn('name', ['active', 'lapsed', 'long_term_lapsed']);
  if (segments != null && segments.length === 3) {
    logger.debug('doUpdatePlayersActivitySegments', { brandId });
    const bindings = {
      brandId,
      activeSegmentId: segments.find((s) => s.name === 'active').id,
      lapsedSegmentId: segments.find((s) => s.name === 'lapsed').id,
      longLapsedSegmentId: segments.find((s) => s.name === 'long_term_lapsed').id,
      allSegmentIds: segments.map((s) => s.id),
    };

    const queryForUpdate = `
      WITH pas AS (
        SELECT
          a.id as "playerId",
            (CASE
              WHEN (CURRENT_DATE - a."lastLogin"::DATE) BETWEEN 0 AND 29 THEN :activeSegmentId
              WHEN (CURRENT_DATE - a."lastLogin"::DATE) BETWEEN 30 AND 180 THEN :lapsedSegmentId
              ELSE :longLapsedSegmentId
            END)::int as "segmentId"
        FROM players a
        WHERE a."brandId" = :brandId
        AND EXISTS (
          SELECT b."playerId"
          FROM player_segments b
          WHERE b."playerId" = a.id AND b."segmentId" IN (:allSegmentIds:)
        )
      )
      UPDATE player_segments
      SET "segmentId" = sub."newSegmentId"
      FROM (
        SELECT
          ps."playerId",
          ps."segmentId",
          pas."segmentId" as "newSegmentId"
        FROM player_segments ps
        INNER JOIN pas ON pas."playerId" = ps."playerId"
        WHERE ps."segmentId" IN (:allSegmentIds:) AND ps."segmentId" != pas."segmentId"
      ) as sub
      WHERE sub."playerId" = player_segments."playerId" AND sub."segmentId" = player_segments."segmentId"
      RETURNING player_segments."playerId"`;

    const queryForInsert = `
      INSERT INTO player_segments ("playerId", "segmentId")
        (
          SELECT t."playerId", t."segmentId"
          FROM (
            SELECT
              a.id as "playerId",
              (CASE
                WHEN (CURRENT_DATE - a."lastLogin"::DATE) BETWEEN 0 AND 29 THEN :activeSegmentId
                WHEN (CURRENT_DATE - a."lastLogin"::DATE) BETWEEN 30 AND 180 THEN :lapsedSegmentId
                ELSE :longLapsedSegmentId
              END)::int as "segmentId"
            FROM players a
            WHERE a."brandId" = :brandId
            AND NOT EXISTS (
              SELECT b."playerId"
              FROM player_segments b
              INNER JOIN player_segments c ON c."playerId" = b."playerId" AND c."segmentId" IN (:allSegmentIds:)
              WHERE b."playerId" = a.id
            )
          ) t
        )
      RETURNING "playerId"`;

    await pg.transaction(async (tx) => {
      const { rows: updated } = await tx.raw(queryForUpdate, bindings);
      const { rows: inserted } = await tx.raw(queryForInsert, bindings);
      updates.push(...updated.map((x) => +x.playerId));
      updates.push(...inserted.map((x) => +x.playerId));
    });
  }
};

const doUpdatePlayerSegments = async (brandId: string, playerId: ?Id, updates: Id[] = []) => {
  await updateSegment(brandId, playerId, 'churned', updates, tx =>
    tx('players')
      .where('numDeposits', '>', 0)
      .innerJoin('payments', 'players.id', 'payments.playerId')
      .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete' })
      .groupBy('players.id')
      .having(pg.raw('max(payments.timestamp)'), '<', pg.raw('now() - \'50 days\'::interval')));

  await updateSegment(brandId, playerId, 'singledeposit250', updates, tx => singleDepositQuery(tx, 250));
  await updateSegment(brandId, playerId, 'singledeposit250_30', updates, tx => singleDepositQuery(tx, 250, 30));
  await updateSegment(brandId, playerId, 'singledeposit250_60', updates, tx => singleDepositQuery(tx, 250, 60));
  await updateSegment(brandId, playerId, 'singledeposit250_90', updates, tx => singleDepositQuery(tx, 250, 90));
  await updateSegment(brandId, playerId, 'deposits500', updates, tx => depositQuery(tx, 500, 10));
  await updateSegment(brandId, playerId, 'deposits3000', updates, tx => depositQuery(tx, 3000, 20));

  await updateSegment(brandId, playerId, 'active_low', updates, tx => activeDepositQuery(tx, 0, 100));
  await updateSegment(brandId, playerId, 'active_medium', updates, tx => activeDepositQuery(tx, 100, 500));
  await updateSegment(brandId, playerId, 'active_high', updates, tx => activeDepositQuery(tx, 500));
  await updateSegment(brandId, playerId, 'active_cumulative_low', updates, tx => activeCumulativeDepositQuery(tx, 0, 500));
  await updateSegment(brandId, playerId, 'active_cumulative_medium', updates, tx => activeCumulativeDepositQuery(tx, 500, 2000));
  await updateSegment(brandId, playerId, 'active_cumulative_high', updates, tx => activeCumulativeDepositQuery(tx, 2000));

  await updateSegment(brandId, playerId, 'vip', updates, tx => tx('players')
    .whereRaw(`players.id in (select players.id from players join (
        select sum(amount/base_currencies."defaultConversion"), payments."playerId", date_trunc('day', payments.timestamp) as day
        from payments
        join players on payments."playerId"=players.id
        join base_currencies on players."currencyId"=base_currencies.id
        where payments."paymentType"='deposit' and payments.status='complete'
        group by payments."playerId", date_trunc('day', payments.timestamp)
        having sum(amount/base_currencies."defaultConversion") > 50000
      ) deposits on players.id = deposits."playerId"
      join (
        select distinct payments."playerId"
        from payments
        join players on payments."playerId"=players.id
        join base_currencies on players."currencyId"=base_currencies.id
        where payments."paymentType"='deposit' and payments.status='complete' and payments.timestamp > now() - '3 month'::interval
        group by payments."playerId", date_trunc('day', payments.timestamp)
        having sum(amount/base_currencies."defaultConversion") > 50000
      ) recent_deposits on players.id = recent_deposits."playerId"
      group by players.id
      having count(deposits.day) > 5)`));

  await updateSegment(brandId, playerId, 'bad_session', updates, tx => rtpQuery(tx, '<', 80));
  await updateSegment(brandId, playerId, 'ok_session', updates, tx => rtpQuery(tx, 'BETWEEN', pg.raw('? AND ? ', [80, 100])));
  await updateSegment(brandId, playerId, 'great_session', updates, tx => rtpQuery(tx, '>', 100));
  await updateSegment(brandId, playerId, 'welcome_bonus', updates, tx => tx('players')
    .innerJoin('payments', 'players.id', 'payments.playerId')
    .where({ 'payments.paymentType': 'deposit', 'payments.status': 'complete', 'payments.index': 0 })
    .whereNotNull('payments.bonusId'));

  await updateSegment(brandId, playerId, 'last_depo_casual', updates, tx => lastDepositQuery(tx, 0, 100));
  await updateSegment(brandId, playerId, 'last_depo_regular', updates, tx => lastDepositQuery(tx, 100, 200));
  await updateSegment(brandId, playerId, 'last_depo_potential_highroller', updates, tx => lastDepositQuery(tx, 200, 500));
  await updateSegment(brandId, playerId, 'last_depo_highroller', updates, tx => lastDepositQuery(tx, 500, 50000));

  await updateSegment(brandId, playerId, 'depleted', updates, tx =>
    tx('players')
      .innerJoin('conversion_rates', 'players.currencyId', 'conversion_rates.currencyId')
      .where('numDeposits', '>', 0)
      .whereRaw('((balance + "bonusBalance" + "reservedBalance") / conversion_rates."conversionRate") < 200')
  );

  await updateSegment(brandId, playerId, `level-1`, updates, tx => tx('players').where('numDeposits', 0));
  await updateSegment(brandId, playerId, `level-2`, updates, tx => tx('players').whereIn('numDeposits', [1, 2]));
  // eslint-disable-next-line no-plusplus
  for (let level = 0; level < levelWager.length; level++) {
    await updateSegment(brandId, playerId, `level-${level + 3}`, updates, promotionWageringBetween('CJ_LOYALTY_POINTS', level > 0 ? levelWager[level -1] : 0, levelWager[level]));
  }

  await updateSegment(brandId, playerId, 'selfexcluded', updates, (tx) =>
    tx('players')
      .crossJoin({
        ps: pg.raw(
          'LATERAL ?',
          pg({ p: 'players' })
            .select('id')
            .where((qb) =>
              qb
                .where('players.personId', pg.raw('??', 'p.personId'))
                .orWhere('players.id', pg.raw('??', 'p.id')),
            ),
        ),
      })
      .innerJoin('player_limits', 'ps.id', 'player_limits.playerId')
      .where({ 'player_limits.type': 'exclusion', 'player_limits.active': true })
      .whereRaw('(expires > now() or (expires is null and permanent = true))'),
  );

  await updateSegment(brandId, playerId, 'limit', updates, tx =>
    tx('players')
      .innerJoin('player_limits', 'players.id', 'player_limits.playerId')
      .innerJoin('player_counters', 'player_limits.id', 'player_counters.limitId')
      .whereIn('player_limits.type', ['deposit_amount', 'bet', 'loss'])
      .where('player_limits.active', true)
      .where('player_counters.active', true)
      .whereRaw('(expires > now() or (expires is null and permanent = true)) and player_counters.amount >= player_counters.limit')
  );

  await updateSegment(brandId, playerId, 'level-1-rookie', updates, tx => cumulativeDepositQuery(tx, 5, 100));
  await updateSegment(brandId, playerId, 'level-2-regular', updates, tx => cumulativeDepositQuery(tx, 100, 500));
  await updateSegment(brandId, playerId, 'level-3-intermediate', updates, tx => cumulativeDepositQuery(tx, 500, 1000));
  await updateSegment(brandId, playerId, 'level-4-pot-vip', updates, tx => cumulativeDepositQuery(tx, 1000, 5000));
  await updateSegment(brandId, playerId, 'level-5-vip-bronze', updates, tx => cumulativeDepositQuery(tx, 5000, 10000));
  await updateSegment(brandId, playerId, 'level-6-vip-silver', updates, tx => cumulativeDepositQuery(tx, 10000, 50000));
  await updateSegment(brandId, playerId, 'level-7-vip-gold', updates, tx => cumulativeDepositQuery(tx, 50000));
};

const updatePlayerSegments = async (brandId: string, playerId: Id) => {
  logger.debug('doUpdatePlayerSegments', brandId, playerId);
  await doUpdatePlayerSegments(brandId, playerId);
};

const updateSegments = async (updated?: Id[]): Promise<void | Array<Id>> => {
  for (const brand of brands) {
    const updatePlayers: Id[] = [];
    await doUpdatePlayerSegments(brand.id, null, updatePlayers);
    const players: Id[] = _.uniq(updatePlayers);
    logger.debug('updateSegments', players.length);
    await Promise.all(
      players.map((playerId) => limit(() => Notification.updatePlayer(playerId, 'Default', 1000))),
    );
    if (updated) {
      updated.push(...players);
    }
  }
  return updated;
};

const dailyUpdateSegmentsHandler = async (updated?: Id[]): Promise<void | Array<Id>> => {
  for (const brand of brands) {
    try {
      const processedPlayers: Id[] = [];
      await doUpdatePlayersActivitySegments(brand.id, processedPlayers);
      const uniquePlayers: Id[] = _.uniq(processedPlayers);
      logger.debug('dailyUpdateSegmentsHandler', {
        brand: brand.id,
        totalPlayers: uniquePlayers.length,
      });
      await Promise.all(
        uniquePlayers.map((playerId) =>
          limit(() => Notification.updatePlayer(playerId, 'Default', 1000)),
        ),
      );
      if (updated) {
        updated.push(...uniquePlayers);
      }
    } catch (error) {
      logger.error('XXX dailyUpdateSegmentsHandler', {
        brand,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  return updated;
};

const getPlayerSegments = async (playerId: Id): Promise<string[]> => {
  const segments = await pg('players')
    .select('segments.name')
    .innerJoin('player_segments', 'players.id', 'player_segments.playerId')
    .innerJoin('segments', 'player_segments.segmentId', 'segments.id')
    .where({ playerId });
  return segments.map(({ name }) => name);
};

module.exports = {
  updatePlayerSegments,
  dailyUpdateSegmentsHandler,
  getPlayerSegments,
  updateSegments,
};
