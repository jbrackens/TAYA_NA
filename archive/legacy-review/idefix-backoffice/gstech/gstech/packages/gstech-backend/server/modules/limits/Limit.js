/* @flow */
import type { Limit, LimitDraft, FullLimit, LimitType, LimitPeriodType } from 'gstech-core/modules/types/limits';
import type { CounterUpdateResult } from './Counter';
import type { GameWithProfile } from '../games/Game';

const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const pg = require('gstech-core/modules/pg');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const logger = require('gstech-core/modules/logger');
const { addEvent } = require('../players/PlayerEvent');
const Player = require('../players/Player');
const { getConnectedPlayers, personPlayerIdsQuery } = require('../persons/Person');
const { updateCounterWithBet } = require('./Counter');
const { setupPromotions } = require('../promotions');
const Notification = require('../core/notifications');
const Session = require('../sessions/Session');

const LIMIT_FIELDS = [
  'id',
  'expires',
  'permanent',
  'exclusionKey',
  'type',
  'limitValue',
  'periodType',
  'isInternal',
  'playerId',
];

const getActive = (playerId: Id, type: LimitType): Knex$QueryBuilder<?Limit> =>
    pg('player_limits')
      .first(LIMIT_FIELDS)
      .modify((qb) => {
        if (type === 'exclusion') {
          qb.with('person', personPlayerIdsQuery(pg, playerId)).whereIn(
            'playerId',
            pg('person').select('playerIds'),
          );
        } else {
          qb.where('playerId', playerId);
        }
      })
      .where({ active: true, type })
      .whereRaw('(expires > now() or (expires is null and permanent = true))')
      .whereRaw('"createdAt" <= now()')
      .orderBy('expires', 'desc');

const getActives = (playerId: Id): Knex$QueryBuilder<Limit[]> =>
    pg('player_limits')
      .with('person', personPlayerIdsQuery(pg, playerId))
      .select(LIMIT_FIELDS)
      .where(qb => {
        qb.where(qb => {
          qb.where({ type: 'exclusion' }).whereIn('playerId', pg('person').select('playerIds'))
        }).orWhere(qb => {
          qb.whereNot({ type: 'exclusion' }).where({ playerId })
        })
      })
      .where({ active: true })
      .whereRaw('(expires > now() or (expires is null and permanent = true))')
      .whereRaw('"createdAt" <= now()')
      .orderBy('expires', 'desc');

const getLimitsWithCounters = (playerId: Id, type?: LimitType): Knex$QueryBuilder<Limit[]> => {
  const week = Number(moment().format('YYYYWW'));
  const month = Number(moment().format('YYYYMM'));
  const date = Number(moment().format('YYYYMMDD'));

  return pg('player_limits')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .leftOuterJoin('player_counters', (qb) =>
      qb
        .on('player_limits.id', 'player_counters.limitId')
        .on('player_limits.active', pg.raw('true'))
        .onIn('player_counters.week', [0, week])
        .onIn('player_counters.month', [0, month])
        .onIn('player_counters.date', [0, date]),
    )
    .select([
      'player_limits.id',
      'player_limits.createdAt',
      'expires',
      'permanent',
      'exclusionKey',
      'player_limits.type',
      'limitValue',
      'limit',
      'amount',
      'periodType',
      'reason',
      'isInternal',
    ])
    .distinctOn('player_limits.type')
    .where((qb) => {
      qb.where((qb) => {
        qb.where('player_limits.type', 'exclusion').whereIn(
          'player_limits.playerId',
          pg('person').select('playerIds'),
        );
      }).orWhere((qb) => {
        qb.whereNot('player_limits.type', 'exclusion').where('player_limits.playerId', playerId);
      });
    })
    .where({ 'player_limits.active': true })
    .modify((query) => (type != null ? query.where({ 'player_limits.type': type }) : query))
    .whereRaw('(expires > now() or (expires is null and permanent = true))')
    .orderBy(['player_limits.type', 'player_limits.createdAt']);
};

const get = (playerId: Id): Knex$QueryBuilder<FullLimit[]> =>
  pg('player_limits')
    .with('person', personPlayerIdsQuery(pg, playerId))
    .select('*')
    .where(qb => {
      qb.where(qb => {
        qb.where('player_limits.type', 'exclusion').whereIn('player_limits.playerId', pg('person').select('playerIds'))
      }).orWhere(qb => {
        qb.whereNot('player_limits.type', 'exclusion').where('player_limits.playerId', playerId)
      })
    })
    .orderBy('active', 'desc')
    .orderBy('expires');

const getByExclusionKey = (exclusionKey: UUID): Knex$QueryBuilder<?FullLimit> =>
  pg('player_limits')
    .select('*')
    .where({ exclusionKey })
    .first();

const createLimitCountersTx = async (playerId: Id, tx: Knex$Transaction<any>) => {
  const limits = await tx('player_limits')
    .select('id', 'periodType', 'type', 'limitValue')
    .where({ playerId, active: true })
    .whereRaw('(expires > now() or (expires is null and permanent = true)) and "periodType" is not null')
    .forUpdate();

  await tx('player_counters').update({ active: false }).where({ playerId, active: true }).whereRaw('"limitId" in (select id from player_limits where "playerId"=? and (active=false or expires<now()))', [playerId]);

  await Promise.all(limits.map((limit) => {
    const date = limit.periodType === 'daily' ? Number(moment().format('YYYYMMDD')) : 0;
    const week = limit.periodType === 'weekly' ? Number(moment().format('YYYYWW')) : 0;
    const month = limit.periodType === 'monthly' ? Number(moment().format('YYYYMM')) : 0;
    const { type } = limit;
    const value = limit.limitValue;
    return tx.raw(
      `insert into player_counters ("playerId", "limitId", "limit", "type", "date", "week", "month")
      values (?,?,?,?,?,?,?)
      on conflict("playerId", "limitId", "type", "date", "week", "month") do nothing`,
      [playerId, limit.id, value, type, date, week, month],
    );
  }));
};

const mapCounter = (periodType: LimitPeriodType, switchTime: Date) => (row: any) => {
  const date = periodType === 'daily' ? Number(moment(switchTime).format('YYYYMMDD')) : 0;
  const week = periodType === 'weekly' ? Number(moment(switchTime).format('YYYYWW')) : 0;
  const month = periodType === 'monthly' ? Number(moment(switchTime).format('YYYYMM')) : 0;
  const updates = {
    date,
    week,
    month,
  };
  return { ...row, ...updates };
};

const copyLimitCounters = async (sourceLimitId: Id, targetLimitId: Id, periodType: LimitPeriodType, switchTime: Date, newLimitValue: Money, tx: Knex$Transaction<any>) => {
  const counters = await tx('player_counters')
    .select('player_counters.playerId', 'player_counters.limit', 'player_counters.amount', 'player_counters.type', 'player_counters.date', 'player_counters.week', 'player_counters.month')
    .innerJoin('player_limits', 'player_counters.limitId', 'player_limits.id')
    .where({ 'player_limits.id': sourceLimitId })
    .whereRaw('(expires > now() or (expires is null and permanent = true)) and "periodType" is not null and player_counters.active = true')
    .forUpdate();
  logger.debug('Copying limit counters', counters);
  await Promise.all(counters.map(mapCounter(periodType, switchTime)).map(counter =>
    // TODO here's a bug with this: create 50e limit 26th of month, deposit 50e, raise limit to 100e -> it counts 50e as used for next month.
    tx.raw(
      `insert into player_counters
        ("playerId", "limitId", "limit", "amount", "type", "date", "week", "month") values (?,?,?,?,?,?,?,?)
      on conflict("playerId", "limitId", "type", "date", "week", "month") do nothing`,
      [counter.playerId, targetLimitId, newLimitValue, counter.amount, counter.type, counter.date, counter.week, counter.month],
    )
  ));
};


const createLimitCounters = (playerId: Id): Promise<void> => pg.transaction(tx => createLimitCountersTx(playerId, tx));

const create = async ({
  playerId,
  permanent,
  expires,
  reason,
  type,
  limitValue,
  periodType,
  userId,
  isInternal,
}: LimitDraft): Promise<any> => {
  const result = await pg.transaction(async (tx) => {
    const [existingLimit] = await tx('player_limits')
      .modify((qb) => {
        if (type === 'exclusion') {
          qb.with('person', personPlayerIdsQuery(pg, playerId)).whereIn(
            'playerId',
            pg('person').select('playerIds'),
          );
        } else {
          qb.where('playerId', playerId);
        }
      })
      .where({ type, active: true })
      .whereRaw(
        '(player_limits.expires > now() or (player_limits.expires is null and player_limits.permanent = true))',
      );
    if (existingLimit)
      return Promise.reject({
        error: 'Two active limits of same type on the same time is not allowed',
        type,
      });

    const limit = await tx('player_limits')
      .insert({
        playerId,
        permanent,
        expires,
        reason,
        exclusionKey: uuid(),
        type,
        periodType,
        limitValue,
        userId,
        isInternal,
      })
      .returning(LIMIT_FIELDS);
    await createLimitCountersTx(playerId, tx);
    await addEvent(playerId, userId, 'account', 'createLimit', {
      type,
      permanent,
      expires,
      reason,
      limitValue,
      periodType,
      isInternal,
    }).transacting(tx);
    if (type === 'exclusion') {
      const players = await getConnectedPlayers(tx, playerId);
      players.forEach(async (player) => {
        await Session.destroy(player, 'logout');
      });
    }
    return limit;
  });
  await Notification.updatePlayer(playerId);
  return result;
};

const raise = async (playerId: Id, limitId: Id, limitValue: Money, reason: string, periodType: LimitPeriodType, userId: ?Id): Promise<Limit> => {
  const result = await pg.transaction(async (tx): Promise<Limit> => {
    const oldLimit = await pg('player_limits').first('*').where({ id: limitId });
    const expires = moment();
    if (limitValue > oldLimit.limitValue) {
      expires.add(oldLimit.permanent ? 7 : 1, 'days');
    } else {
      expires.subtract(1, 'seconds');
    }
    const [limit]: [Limit] = await tx('player_limits')
      .insert({
        playerId,
        permanent: oldLimit.permanent,
        createdAt: expires,
        expires: oldLimit.expires,
        reason,
        exclusionKey: uuid(),
        type: oldLimit.type,
        periodType,
        limitValue,
        userId,
        isInternal: oldLimit.isInternal,
      })
      .returning('*');
    await copyLimitCounters(oldLimit.id, limit.id, periodType, expires, limitValue, tx);
    await tx('player_limits').update({ expires, permanent: false }).where({ id: oldLimit.id });
    await addEvent(playerId, userId, 'account', 'raiseLimit', { type: oldLimit.type, permanent: oldLimit.permanent, expires, reason, limitValue, periodType: oldLimit.periodType }).transacting(tx);
    return limit;
  });
  await Notification.updatePlayer(playerId);
  return result;
};

const cancel = async (exclusionKey: UUID, delay: boolean, reason: string, userId: ?Id): Promise<any> => {
  const result = await pg.transaction(async (tx) => {
    const exclusion = await tx('player_limits')
      .first(
        'cancelled',
        'playerId',
        'expires',
        'exclusionKey',
        'type',
        'periodType',
        'limitValue',
        'permanent',
        'isInternal',
      )
      .where({ exclusionKey, active: true })
      .forUpdate();
    if (exclusion != null && exclusion.cancelled == null) {
      if (delay) {
        const coolOffPeriod = (exclusion.permanent || exclusion.type === 'exclusion') ? 7 : 1;
        const newExpires = moment().add(coolOffPeriod, 'days');
        if (exclusion.expires != null && exclusion.expires < newExpires) {
          return Promise.reject({ error: 'No need to modify exclusion', exclusion: { expires: exclusion.expires, exclusionKey: exclusion.exclusionKey } });
        }
        const { playerId } = exclusion;
        const newExclusionKey = uuid();
        const [{ id }] = await tx('player_limits')
          .update({ active: false, cancelled: new Date() })
          .where({ exclusionKey })
          .returning('id');
        const [{ id: newId }] = await tx('player_limits')
          .insert({
            exclusionKey: newExclusionKey,
            playerId,
            permanent: exclusion.permanent,
            expires: newExpires,
            reason,
            periodType: exclusion.periodType,
            limitValue: exclusion.limitValue,
            userId,
            type: exclusion.type,
          })
          .returning('id');
        await copyLimitCounters(id, newId, exclusion.periodType, new Date(), exclusion.limitValue, tx);
        await addEvent(playerId, userId, 'account', 'cancelLimit', { type: exclusion.type, delay, reason }).transacting(tx);
        await createLimitCountersTx(playerId, tx);
        return { expires: newExpires, exclusionKey: newExclusionKey, playerId: exclusion.playerId };
      }

      const cancelDate = new Date();
      const cancelledIds = await tx('player_limits')
        .update({ active: false, cancelled: cancelDate, cancelUserId: userId })
        .where({ exclusionKey })
        .returning('id');
      await tx('player_counters')
        .update({ active: false })
        .whereIn(
          'limitId',
          cancelledIds.map(({ id }) => id),
        );
      await addEvent(exclusion.playerId, userId, 'account', 'cancelLimit', { type: exclusion.type, delay, reason }).transacting(tx);
      return { cancelled: cancelDate, playerId: exclusion.playerId };
    }
    return Promise.reject({ error: 'Exclusion is not active' });
  });
  await Notification.updatePlayer(result.playerId);
  return result;
};


const checkSessionLength = async (sessionId: Id, tx: Knex) => {
  const [session]: { timestamp: Date, limit: number }[] = await tx('sessions')
    .select('player_limits.limitValue as limit', 'sessions.timestamp as timestamp')
    .innerJoin('player_limits', 'player_limits.playerId', 'sessions.playerId')
    .where({
      'sessions.id': sessionId,
      'player_limits.active': true,
      'player_limits.type': 'session_length',
    })
    .whereRaw(
      '(player_limits.expires > now() or (player_limits.expires is null and player_limits.permanent = true))',
    )
    .limit(1);

  if (session != null) {
    const sessionExpireTime = moment(session.timestamp).add(session.limit, 'minutes').toDate();
    if (sessionExpireTime < Date.now()) {
      return Promise.reject(walletErrorCodes.PLAY_LIMIT_REACHED);
    }
  }
  return true;
};


const checkTimeoutLimit = async (playerId: Id) => {
  const timeoutLimit = await getActive(playerId, 'timeout');
  if (timeoutLimit) {
    return Promise.reject(walletErrorCodes.PLAY_LIMIT_REACHED);
  }

  return true;
};

const checkGameStart = async (playerId: Id, sessionId: Id, requireActivation: boolean, tx: Knex): Promise<boolean> => {
  await createLimitCounters(playerId);
  try {
    await checkSessionLength(sessionId, tx);
    await checkTimeoutLimit(playerId);
  } catch (e) {
    return Promise.reject({ error: errorCodes.PLAY_LIMITS_REACHED });
  }
  const { allowGameplay, activated } = await Player.getAccountStatus(playerId).transacting(tx);
  const activeExclusion = await getActive(playerId, 'exclusion');
  if (!allowGameplay || activeExclusion)
    return Promise.reject({ error: errorCodes.GAME_PLAY_BLOCKED });
  if (requireActivation && !activated)
    return Promise.reject({ error: errorCodes.GAME_PLAY_REQUIRES_ACTIVATION });
  return true;
};

const setupAccount = async (playerId: Id) => {
  await setupPromotions(playerId);
  await createLimitCounters(playerId);
};

const checkDeposit = async (playerId: Id) => {
  await createLimitCounters(playerId);
};

const checkLogin = async (playerId: Id): Promise<
    {
      error?: GSError,
      exclusion?: {exclusionKey?: UUID, expires?: Date, permanent?: boolean, limitType?: LimitType },
    }> => {
  const activeExclusion = await getActive(playerId, 'exclusion');
  if (activeExclusion != null) {
    const { expires, exclusionKey, permanent, type: limitType } = activeExclusion;
    return { error: errorCodes.PLAYER_EXCLUDED, exclusion: { expires, exclusionKey, permanent, limitType } };
  }
  const status = await Player.getAccountStatus(playerId);
  if (status.gamblingProblem) {
    return { error: errorCodes.GAMBLING_PROBLEM, exclusion: undefined };
  }
  await setupAccount(playerId);
  return { error: undefined, exclusion: undefined };
};


const updateBetCounters = async (playerId: Id, sessionId: ?Id, amount: Money, usingBonusMoney: boolean, currencyId: string, game: GameWithProfile, tx: Knex): Promise<Array<CounterUpdateResult>> => {
  const result = await updateCounterWithBet(playerId, amount, usingBonusMoney, currencyId, game, tx);
  if (sessionId != null) {
    await checkSessionLength(sessionId, tx);
  }
  return result;
};

module.exports = {
  getActive,
  getActives,
  getLimitsWithCounters,
  get,
  getByExclusionKey,
  cancel,
  create,
  raise,
  checkGameStart,
  checkLogin,
  checkDeposit,
  updateBetCounters,
  setupAccount,
};
