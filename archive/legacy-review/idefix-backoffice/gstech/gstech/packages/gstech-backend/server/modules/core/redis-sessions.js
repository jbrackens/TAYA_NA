/* @flow */
const _ = require('lodash');
const { v1: uuid } = require('uuid');

export type Initial = {
  redis: any,
  redisns: string,
};

export type Session = {
  d: any,
  id: string,
  idle: number,
  ip: string,
  r: number,
  ttl: number,
  w: number,
};

const now = () => new Date().getTime() / 1000;

const createMultiStatement = (o: Initial, app: string, token: string, id: string, ttl: number): string[][] => {
  const n = now();
  return [
    ['zadd', `${o.redisns}${app}:_sessions`, String(n), `${token}:${id}`],
    ['zadd', `${o.redisns}${app}:_users`, String(n), id],
    ['zadd', `${o.redisns}SESSIONS`, String(n + ttl), `${app}:${token}:${id}`],
  ];
};

const deserializeSession = (session: any[]): ?Session => {
  if (session[0] === null) {
    return null;
  }
  const o: Session = {
    id: session[0],
    r: Number(session[1]),
    w: Number(session[2]),
    ttl: Number(session[3]),
    d: JSON.parse(session[4]),
    idle: now() - session[5],
    ip: session[6],
  };

  if (o.ttl < o.idle) {
    return null;
  }
  return o;
};

const activeUserCount = async (o: Initial, app: string, dt: number) => {
  const resp = await o.redis.zcount(`${o.redisns}${app}:_users`, now() - dt, '+inf');
  return resp;
};

const create = async (o: Initial, app: string, id: string, ip: string, d: any, ttl: number = 7200) => {
  const token = uuid();
  const mc = createMultiStatement(o, app, token, id, ttl);
  mc.push(['sadd', `${o.redisns}${app}:us:${id}`, token]);
  const sess = [
    'hmset',
    `${o.redisns}${app}:${token}`,
    'id', id, 'r', '1', 'w', '1', 'ip', ip, 'la', String(now()), 'ttl', String(ttl), 'd', JSON.stringify(d),
  ];
  mc.push(sess);
  const resp = await o.redis.multi(mc).exec();
  if (resp[4][1] !== 'OK') {
    return Promise.reject('Unknow error');
  }
  return token;
};

const get = async (o: Initial, app: string, token: string, noupdate: boolean = false): Promise<?Session> => {
  const thekey = `${o.redisns}${app}:${token}`;
  const resp = await o.redis.hmget(thekey, 'id', 'r', 'w', 'ttl', 'd', 'la', 'ip');

  const e = deserializeSession(resp);
  if (e == null) {
    return null;
  }

  if (noupdate) {
    return e;
  }

  const mc = createMultiStatement(o, app, token, e.id, e.ttl);
  mc.push(['hincrby', thekey, 'r', '1']);
  if (e.idle > 1) {
    mc.push(['hset', thekey, 'la', String(now())]);
  }
  await o.redis.multi(mc).exec();
  return e;
};

const clear = async (o: Initial, app: string, token: string, id: string) => {
  const mc = [
    ['zrem', `${o.redisns}${app}:_sessions`, `${token}:${id}`],
    ['srem', `${o.redisns}${app}:us:${id}`, token],
    ['zrem', `${o.redisns}SESSIONS`, `${app}:${token}:${id}`],
    ['del', `${o.redisns}${app}:${token}`],
    ['exists', `${o.redisns}${app}:us:${id}`],
  ];

  const resp = await o.redis.multi(mc).exec();
  if (resp[4][1] === 0) {
    await o.redis.zrem(`${o.redisns}${app}:_users`, id);
  }
  return resp[3][1];
};

const kill = async (o: Initial, app: string, token: string) => {
  const resp = await get(o, app, token, true);
  if (resp == null) {
    return 0;
  }
  return clear(o, app, token, resp.id);
};

const killall = async (o: Initial, app: string) => {
  const appsessionkey = `${o.redisns}${app}:_sessions`;
  const appuserkey = `${o.redisns}${app}:_users`;
  const resp = await o.redis.zrange(appsessionkey, 0, -1);

  if (!resp.length) {
    return 0;
  }
  const globalkeys = [];
  const tokenkeys = [];
  const userkeys = [];

  for (const e of resp) {
    const thekey = e.split(':');
    globalkeys.push(`${app}:${e}`);
    tokenkeys.push(`${o.redisns}${app}:${thekey[0]}`);
    userkeys.push(thekey[1]);
  }
  const ussets = _.uniq(userkeys).map(e => `${o.redisns}${app}:us:${e}`);
  const mc = [
    ['zrem', appsessionkey].concat(resp),
    ['zrem', appuserkey].concat(userkeys),
    ['zrem', `${o.redisns}SESSIONS`].concat(globalkeys),
    ['del'].concat(ussets),
    ['del'].concat(tokenkeys),
  ];
  const result = await o.redis.multi(mc).exec();
  return result[0][1];
};

const killSessionsOfId = async (o: Initial, app: string, id: string) => {
  const resp0 = await o.redis.smembers(`${o.redisns}${app}:us:${id}`);
  if (!resp0.length) {
    return 0;
  }
  const mc: string[][] = [];
  for (const token of resp0) {
    mc.push(['zrem', `${o.redisns}${app}:_sessions`, `${token}:${id}`]);
    mc.push(['srem', `${o.redisns}${app}:us:${id}`, token]);
    mc.push(['zrem', `${o.redisns}SESSIONS`, `${app}:${token}:${id}`]);
    mc.push(['del', `${o.redisns}${app}:${token}`]);
  }
  mc.push(['exists', `${o.redisns}${app}:us:${id}`]);

  const resp = await o.redis.multi(mc).exec();
  let total = 0;
  const iterable = resp.slice(3);
  for (let i = 0; i < iterable.length; i += 4) {
    const e = iterable[i];
    total += e;
  }

  if (_.last(resp) === 0) {
    await o.redis.zrem(`${o.redisns}${app}:_users`, id);
  }
  return total;
};

const ping = (o: Initial) => o.redis.ping();
const quit = (o: Initial) => o.redis.quit();

const set = async (o: Initial, app: string, token: string, d: any) => {
  let resp = await get(o, app, token, true);
  if (resp == null) {
    return null;
  }

  if (resp.d) {
    resp.d = _.extend(resp.d, d);
  } else {
    resp.d = d;
  }

  const thekey = `${o.redisns}${app}:${token}`;

  const mc = createMultiStatement(o, app, token, resp.id, resp.ttl);
  mc.push(['hincrby', thekey, 'w', '1']);

  if (resp.idle > 1) {
    mc.push(['hset', thekey, 'la', String(now())]);
  }
  if (!_.isEmpty(resp.d)) {
    mc.push(['hset', thekey, 'd', JSON.stringify(resp.d)]);
  } else {
    mc.push(['hdel', thekey, 'd']);
    resp = _.omit(resp, 'd');
  }

  const reply = await o.redis.multi(mc).exec();
  resp.w = reply[3]; // eslint-disable-line prefer-destructuring
  return resp;
};

const returnSessions = async (o: Initial, app: string, sessions: string[]): Promise<Session[]> => {
  if (sessions.length === 0) {
    return [];
  }
  const mc = sessions.map(e => ['hmget', `${o.redisns}${app}:${e}`, 'id', 'r', 'w', 'ttl', 'd', 'la', 'ip']);
  const resp: any[] = await o.redis.multi(mc).exec();
  const result = _.compact<Session>(resp.map(r => deserializeSession(r[1])));
  return result;
};

const sessionsOfApp = async (o: Initial, app: string, dt: number): Promise<Session[]> => {
  const resp = await o.redis.zrevrangebyscore(`${o.redisns}${app}:_sessions`, '+inf', now() - dt);
  const r = resp.map(e => e.split(':')[0]);
  const result = await returnSessions(o, app, r);
  return result;
};

const sessionsOfId = async (o: Initial, app: string, id: string): Promise<Session[]> => {
  const resp = await o.redis.smembers(`${o.redisns}${app}:us:${id}`);
  const result = await returnSessions(o, app, resp);
  return result;
};

const sessionOfId = async (o: Initial, app: string, id: string): Promise<?Session> => {
  const resp = await o.redis.smembers(`${o.redisns}${app}:us:${id}`);
  if (resp.length === 0) {
    return null;
  }
  return get(o, app, resp[0]);
};

const clearSessions = async (o: Initial) => {
  const resp = await o.redis.zrangebyscore(`${o.redisns}SESSIONS`, '-inf', now());
  await Promise.all(resp.map(s => s.split(':')).map(e => clear(o, e[0], e[1], e[2])));
};

const createSessionStore = (redis: any, opts: { namespace: string, wipe: number } = { namespace: 'rs', wipe: 600 }): {
  activeUserCount: (app: string, dt?: number) => Promise<any>,
  create: (
    app: string,
    id: string,
    ip: string,
    d: any,
    ttl?: number
  ) => Promise<any> | Promise<string>,
  get: (app: string, token: string) => Promise<?Session>,
  kill: (app: string, token: string) => Promise<any> | Promise<number>,
  killSessionsOfId: (app: string, id: string) => Promise<number>,
  killall: (app: string) => Promise<any> | Promise<number>,
  ping: () => any,
  quit: () => any,
  sessionOfId: (app: string, id: string) => Promise<?Session>,
  sessionsOfApp: (app: string, dt?: number) => Promise<Array<Session>>,
  sessionsOfId: (app: string, id: string) => Promise<Array<Session>>,
  set: (
    app: string,
    token: string,
    data: any
  ) => Promise<
      ?{
        d: any,
        id: string,
        idle: number,
        ip: string,
        r: number,
        ttl: number,
        w: number,
      }>,
} => {
  const o: Initial = {
    redis,
    redisns: `${opts.namespace}:`,
  };
  setInterval(() => clearSessions(o), opts.wipe * 1000);

  return {
    activeUserCount: (app: string, dt: number = 60 * 5) => activeUserCount(o, app, dt),
    create: (app: string, id: string, ip: string, d: any, ttl: number = 7200) => create(o, app, id, ip, d, ttl),
    get: (app: string, token: string) => get(o, app, token),
    kill: (app: string, token: string) => kill(o, app, token),
    killall: (app: string) => killall(o, app),
    killSessionsOfId: (app: string, id: string) => killSessionsOfId(o, app, id),
    sessionsOfApp: (app: string, dt: number = 600) => sessionsOfApp(o, app, dt),
    sessionsOfId: (app: string, id: string) => sessionsOfId(o, app, id),
    ping: () => ping(o),
    quit: () => quit(o),
    sessionOfId: (app: string, id: string) => sessionOfId(o, app, id),
    set: (app: string, token: string, data: any) => set(o, app, token, data),
  };
};

module.exports = {
  createSessionStore,
};
