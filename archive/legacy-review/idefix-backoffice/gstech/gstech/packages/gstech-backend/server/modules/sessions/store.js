/* @flow */
import type { Session } from '../core/redis-sessions';

const { createSessionStore } = require('../core/redis-sessions');
const redis = require('../core/redis');

const sessionExpireTimeInSeconds = 30 * 60; // 1800 seconds or 30 minutes

const rs = createSessionStore(redis.create(), {
  namespace: '{sessions}',
  wipe: 300,
});

const appId = (brandId: string) => {
  if (!brandId) {
    throw new Error('Invalid brandId');
  }
  return `app_${brandId}`;
};

const createSession = (brandId: string, playerId: Id, ip: IPAddress, id: Id): Promise<any> | Promise<string> =>
  rs.create(appId(brandId), String(playerId), ip, { playerId, id }, sessionExpireTimeInSeconds);

const getSession = async (brandId: string, token: string): Promise<?any> => {
  const s = await rs.get(appId(brandId), token);
  if (s != null) {
    return s.d;
  }
  return null;
};

const getPlayerSession = async (brandId: string, playerId: Id): Promise<?Session> =>
  rs.sessionOfId(appId(brandId), String(playerId));

const destroySession = async (brandId: string, playerId: Id): Promise<boolean> =>
  rs.killSessionsOfId(appId(brandId), `${playerId}`).then(kill => kill > 0);

const getActiveSessions = async (brandId: string): Promise<{ playerId: Id, ip: IPAddress, idle: number, id: Id}[]> => {
  const sessions: any = await rs.sessionsOfApp(appId(brandId), sessionExpireTimeInSeconds);
  return sessions.map(session => ({ id: Number(session.d.id) }));
};

module.exports = {
  createSession,
  getSession,
  destroySession,
  getPlayerSession,
  getActiveSessions,
};
