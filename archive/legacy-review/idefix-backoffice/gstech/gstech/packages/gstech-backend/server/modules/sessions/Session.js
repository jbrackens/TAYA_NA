/* @flow */
import type { PlayerIdentifier } from 'gstech-core/modules/types/player';
import type { Session as RedisSession } from '../core/redis-sessions';

const moment = require('moment-timezone');
const MobileDetect = require('mobile-detect');
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const store = require('./store');
const { addEvent } = require('../players/PlayerEvent');
const { emitSidebarStatusChanged } = require('../core/socket');

export type SessionToken = string
export type SessionEndReason = 'logout' | 'expired' | 'login';

export type Session = {
  playTimeInMinutes: number,
  win: Money,
  bet: Money,
  timestamp: Date,
  endTimestamp: ?Date,
  endReason: ?SessionEndReason,
  ipAddress: IPAddress
}

export type SessionTotals = {
  realBet: Money,
  realWin: Money,
  bonusBet: Money,
  bonusWin: Money,
};

const parseUserAgent = (userAgent?: string) => {
  if (userAgent != null) {
    const detect = new MobileDetect(userAgent);
    return {
      userAgent,
      mobileDevice: detect.mobile() != null,
    };
  }
  return {};
};

const create = (playerId: Id, ipAddress: IPAddress, userAgent?: string): Promise<Id> =>
  pg('sessions')
    .insert({ playerId, ipAddress, ...parseUserAgent(userAgent) })
    .returning('id')
    .then(([row]) => row?.id);

const get = (playerId: Id, id: Id): Knex$QueryBuilder<Session> =>
  pg('sessions').first(
    pg.raw('round(extract(\'epoch\' FROM now() - timestamp) / 60) AS "playTimeInMinutes"'),
    pg.raw('"realBet" + "bonusBet" as bet'),
    pg.raw('"realWin" + "bonusWin" as win'),
    'timestamp',
    'endTimestamp',
    'endReason',
    'ipAddress',
  ).where({ playerId, id });

const getSessionTotals = async (playerId: Id): Promise<SessionTotals> => {
  const [{ bonusBet, bonusWin, realBet, realWin }] = await pg('sessions')
    .sum('bonusBet as bonusBet')
    .sum('bonusWin as bonusWin')
    .sum('realWin as realWin')
    .sum('realBet as realBet')
    .where({ playerId });
  return {
    bonusBet: bonusBet || 0,
    bonusWin: bonusWin || 0,
    realBet: realBet || 0,
    realWin: realWin || 0,
  };
};

const destroy = async (player: { ...PlayerIdentifier, ...}, endReason: SessionEndReason) => {
  const sessionDestroyed = await store.destroySession(player.brandId, player.id);
  if (sessionDestroyed) {
    await addEvent(player.id, null, 'activity', endReason === 'login' ? 'logoutNewSession' : 'logout');
  }
  await pg('sessions').where({ playerId: player.id }).whereNull('endTimestamp').update({ endReason, endTimestamp: moment() });
  emitSidebarStatusChanged();
};

const expireSession = async (playerId: Id, sessionId: Id) => {
  await addEvent(playerId, null, 'activity', 'sessionExpired');
  await pg('sessions').where({ id: sessionId }).whereNull('endTimestamp').update({ endReason: 'expired', endTimestamp: moment() });
  emitSidebarStatusChanged();
};

const createSession = async (player: {...PlayerIdentifier, ...}, ipAddress: IPAddress, userAgent?: string): Promise<{ token: SessionToken, id: Id }> => {
  await destroy(player, 'login');
  const sessionId = await create(player.id, ipAddress, userAgent);
  const token = await store.createSession(player.brandId, player.id, ipAddress, sessionId);
  emitSidebarStatusChanged();
  return { id: sessionId, token };
};

const getPlayerSession = (brandId: string, playerId: Id): Promise<?RedisSession> => store.getPlayerSession(brandId, playerId);

const pingPlayerSession = (brandId: string, playerId: Id) => {
  try {
    getPlayerSession(brandId, playerId);
  } catch (e) {
    logger.warn('Unable to ping player session', playerId, e);
  }
};

const expiredSessions = (brandId: string, activeSessions: Id[]): Promise<{sessionId: Id, playerId: Id}[]> =>
  pg('sessions')
    .select('playerId', 'sessions.id as sessionId')
    .innerJoin('players', 'players.id', 'sessions.playerId')
    .where('players.brandId', brandId)
    .whereNull('endReason')
    .whereNotIn('sessions.id', activeSessions);

module.exports = { create, get, pingPlayerSession, getSessionTotals, createSession, destroy, getPlayerSession, expiredSessions, expireSession };
