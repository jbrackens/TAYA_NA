/* @flow */

const addEvent = (tx: Knex, userId: ?Id, content: string, details: ?any, ipAddress: IPAddress, createdBy?: Id): Promise<void> =>
  tx('user_events').insert({ userId, content, details, ipAddress, createdBy });

const getLog = async (tx: Knex, userId: Id): Promise<any> =>
  tx('user_events')
    .select('user_events.content as event', 'user_events.createdAt as time', 'user_events.ipAddress as ip', 'users.email as createdBy')
    .leftOuterJoin('users', 'user_events.createdBy', 'users.id')
    .where({ userId })
    .orderBy('user_events.createdAt', 'desc')
    .limit(1000);

module.exports = { addEvent, getLog };
