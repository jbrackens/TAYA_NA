/* @flow */
const { getActiveSessions } = require('../users');
const Lock = require('./Lock');

const update = async () => {
  const sessions = await getActiveSessions();
  const activeSessions = sessions.map(({ sessionId }) => sessionId);
  await Lock.expire(activeSessions);
};

module.exports = { update };
