/* @flow */

const {
  requireAuthentication,
  requireAdminAccess,
  requireReportingAccess,
  requireCampaignAccess,
} = require('./access');
const {
  loginUserHandler,
  logoutUserHandler,
  getUserHandler,
  getUsersHandler,
  getCurrentUserAccessSettingsHandler,
  getUserAccessSettingsHandler,
  updateUserAccessSettingsHandler,
  getUserLogHandler,
  createUserHandler,
  updateUserHandler,
  changePasswordHandler,
  expirePasswordHandler,
  sendVerificationCodeHandler,
  checkVerificationCodeHandler,
  resetPasswordHandler,
} = require('./routes');
const {
  getActiveSessions,
} = require('./sessionStore');

const { getById } = require('./User');

module.exports = {
  getActiveSessions,
  getById,
  access: {
    requireAuthentication,
    requireAdminAccess,
    requireReportingAccess,
    requireCampaignAccess,
  },
  routes: {
    loginUserHandler,
    logoutUserHandler,
    getUserHandler,
    getUsersHandler,
    getCurrentUserAccessSettingsHandler,
    getUserAccessSettingsHandler,
    updateUserAccessSettingsHandler,
    getUserLogHandler,
    createUserHandler,
    updateUserHandler,
    changePasswordHandler,
    expirePasswordHandler,
    sendVerificationCodeHandler,
    checkVerificationCodeHandler,
    resetPasswordHandler,
  },
};
