/* @flow */
const { loginHandler, requireAuthentication, logoutHandler, sessionStatisticsHandler, mobileLoginHandler, requestLoginHandler, completeLoginHandler } = require('./api-routes');
const Session = require('./Session');
const ManufacturerSession = require('./ManufacturerSession');
const { initTestSessionHandler } = require('./test-routes');

module.exports = {
  createSession: Session.createSession,
  destroySession: Session.destroy,
  getPlayerSession: Session.getPlayerSession,
  pingPlayerSession: Session.pingPlayerSession,
  createManufacturerSession: ManufacturerSession.createManufacturerSession,
  expireManufacturerSession: ManufacturerSession.expireManufacturerSession,
  findManufacturerSession: ManufacturerSession.findManufacturerSession,
  findManufacturerSessionWithPlayer: ManufacturerSession.findManufacturerSessionWithPlayer,
  getManufacturerSessions: ManufacturerSession.getManufacturerSessions,
  updateManufacturerSession: ManufacturerSession.updateManufacturerSession,
  getManufacturerSessionsForPlayer: ManufacturerSession.getManufacturerSessionsForPlayer,
  apiRoutes: {
    loginHandler,
    mobileLoginHandler,
    requestLoginHandler,
    completeLoginHandler,
    requireAuthentication,
    logoutHandler,
    sessionStatisticsHandler,
  },
  testRoutes: {
    initTestSessionHandler,
  },
};
