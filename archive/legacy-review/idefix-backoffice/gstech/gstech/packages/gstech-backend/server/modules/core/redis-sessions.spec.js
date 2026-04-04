/* @flow */
const { v1: uuid } = require('uuid');
const { createSessionStore } = require('./redis-sessions');
const redis = require('./redis');

const app = uuid();

describe('sessions', () => {
  let session;
  let token;

  before(async () => {
    session = createSessionStore(redis.create(), {
      namespace: '{tests}',
      wipe: 10,
    });
  });

  it('can ping redis', async () => {
    const r = await session.ping();
    expect(r).to.equal('PONG');
  });

  it('can create session', async () => {
    token = await session.create(app, '123', '123.123.123.123', { foo: 1 });
    expect(token).to.not.equal(null);
  });

  it('can get active session for user', async () => {
    const s: any = await session.sessionOfId(app, '123');
    expect(s.d.foo).to.equal(1);
  });

  it('can get number of active users for app', async () => {
    const count = await session.activeUserCount(app);
    expect(count).to.equal(1);
  });

  it('can get number of active sessions for app', async () => {
    const sessions = await session.sessionsOfApp(app);
    expect(sessions.length).to.equal(1);
  });

  it('can set new data by token', async () => {
    const result: any = await session.set(app, token, { foo: 2 });
    expect(result.d.foo).to.equal(2);
  });

  it('can get current data for token', async () => {
    const result: any = await session.get(app, token);
    expect(result.d.foo).to.equal(2);
  });

  it('can set new data item by token', async () => {
    const result: any = await session.set(app, token, { bar: 3 });
    expect(result.d).to.deep.equal({
      bar: 3,
      foo: 2,
    });
    const result2: any = await session.get(app, token);
    expect(result2.d).to.deep.equal({
      bar: 3,
      foo: 2,
    });
  });

  it('can create another session', async () => {
    token = await session.create(app, '124', '123.123.123.123', { foo: 2 });
    expect(token).to.not.equal(null);
  });

  it('can get active sessions for app', async () => {
    const sessions = await session.sessionsOfApp(app);
    expect(sessions).to.containSubset([
      {
        id: '124',
        d: { foo: 2 },
      },
      {
        id: '123',
        d: { foo: 2, bar: 3 },
      },
    ]);
  });

  it('can kill session for id', async () => {
    const kill = await session.kill(app, token);
    expect(kill).to.equal(1);
  });

  it('does not allow access to data after kill', async () => {
    try {
      await session.get(app, token);
      throw new Error('Error should have been thrown');
    } catch (e) {} // eslint-disable-line
  });

  it('can get number of active sessions for app', async () => {
    const count = await session.activeUserCount(app);
    expect(count).to.equal(1);
  });
});
