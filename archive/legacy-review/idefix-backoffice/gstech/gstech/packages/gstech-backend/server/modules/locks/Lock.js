/* @flow */
const flow = require('lodash/fp/flow');
const keyBy = require('lodash/fp/keyBy');
const mapValues = require('lodash/fp/mapValues');
const pg = require('gstech-core/modules/pg');
const { emit } = require('../core/socket');

const LOCKS = 'locks';

const mapRows = flow(
  keyBy('playerId'),
  mapValues(row => ({
    id: row.userId,
    handle: row.handle,
  })),
);

const broadcastLock = (playerId: Id) => emit('ws/player-locked', { playerId });

module.exports = {
  get: async (userId: Id, userSessionId: UUID): Promise<any> => {
    const locks = await pg(LOCKS)
      .whereNot({ userSessionId })
      .select('userId', 'playerId', 'users.handle')
      .leftOuterJoin('users', 'users.id', 'locks.userId');
    const result = mapRows(locks);
    return result;
  },
  lock: async (playerId: Id, userId: Id, userSessionId: UUID) => {
    await pg.raw(
      'insert into locks("userId", "userSessionId", "playerId") values (?,?,?)',
      [userId, userSessionId, playerId],
    );
    await broadcastLock(playerId);
  },
  release: async (playerId: Id, userId: Id, userSessionId: UUID) => {
    await pg(LOCKS).where({ playerId, userId, userSessionId }).del();
    await broadcastLock(playerId);
  },
  steal: async (playerId: Id, userId: Id, userSessionId: UUID) => {
    await pg(LOCKS).update({ userId, userSessionId }).where({ playerId });
    await broadcastLock(playerId);
  },
  expire: async (activeSessions: UUID[]) => {
    const playerIds = await pg(LOCKS).whereNotIn('userSessionId', activeSessions).returning('playerId').del();
    await Promise.all(playerIds.map(({ playerId }) => broadcastLock(playerId)));
  },
};
