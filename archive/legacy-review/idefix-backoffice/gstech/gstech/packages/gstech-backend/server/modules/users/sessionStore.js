/* @flow */
import type {Session} from '../core/redis-sessions';

const { v1: uuid } = require('uuid');
const { createSessionStore } = require('../core/redis-sessions');
const redis = require('../core/redis');

const APP = 'admin';

const sessionExpireTimeInSeconds = 30 * 60; // 1800 seconds or 30 minutes

const rs = createSessionStore(redis.create(), {
  wipe: 300,
  namespace: '{admin}',
});

const createSession = (id: Id, ip: IPAddress): Promise<any> | Promise<string> =>
  rs.create(APP, String(id), ip, { id, sessionId: uuid() }, sessionExpireTimeInSeconds);

const getSession = (token: string): Promise<any> => rs.get(APP, token).then(s => s != null ? s.d : null);  
const destroySession = (token: string): Promise<any> | Promise<number> => rs.kill(APP, token);
const destroyAllSessions = (): Promise<any> | Promise<number> => rs.killall(APP);
const getSessions = (): Promise<Array<Session>> => rs.sessionsOfApp(APP);
const getActiveSessions = async (): Promise<{ sessionId: UUID, id: Id}[]> => {
  const sessions = await rs.sessionsOfApp(APP, sessionExpireTimeInSeconds);
  return sessions.map(session => ({ sessionId: session.d.sessionId, id: Number(session.d.id) }));
};

module.exports = {
  createSession,
  getSession,
  destroySession,
  destroyAllSessions,
  getSessions,
  getActiveSessions,
};
