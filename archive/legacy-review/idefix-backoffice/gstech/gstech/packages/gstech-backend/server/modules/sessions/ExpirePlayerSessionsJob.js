/* @flow */
const logger = require('gstech-core/modules/logger');
const store = require('./store');
const { settings } = require('../settings');
const Session = require('./Session');

const update = async () => {
  for (const brand of settings().brands) {
    const sessions = await store.getActiveSessions(brand.id);
    logger.debug('Active sessions', brand.id, sessions.length);
    const activeSessions = sessions.map(({ id }) => Number(id));
    const expiredSessions = await Session.expiredSessions(brand.id, activeSessions);
    for (const session of expiredSessions) {
      logger.debug('Expire session', session);
      await Session.expireSession(session.playerId, session.sessionId);
    }
  }
};

module.exports = { update };
