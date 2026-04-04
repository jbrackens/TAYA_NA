/* @flow */
const {
  getExclusionsHandler,
  createExclusionHandler,
  cancelExclusionHandler,
} = require('./api-routes');
const { checkGameStart, checkLogin, checkDeposit, updateBetCounters, getLimitsWithCounters, getActive, setupAccount, create } = require('./Limit');
const {
  updateLimitWithWin,
  updateLimitWithDeposit,
  updateCounters,
  getActiveCounters,
  getWageringRequirementCounter,
  depositLimitRemaining,
  createDepositWageringCounter,
  adjustDepositWageringCounter,
  setDepositWageringCounter,
  disableDepositWageringCounter,
} = require('./Counter');

const routes = require('./routes');

module.exports = {
  updateLimitWithWin,
  updateLimitWithDeposit,
  updateCounters,
  getActiveCounters,
  getActiveLimits: getActive,
  getLimitsWithCounters,
  getWageringRequirementCounter,
  depositLimitRemaining,
  checkGameStart,
  updateBetCounters,
  checkLogin,
  checkDeposit,
  createDepositWageringCounter,
  adjustDepositWageringCounter,
  setDepositWageringCounter,
  disableDepositWageringCounter,
  setupAccount,
  create,
  apiRoutes: {
    getExclusionsHandler,
    createExclusionHandler,
    cancelExclusionHandler,
  },
  routes: {
    getActiveLimitsHandler: routes.getActiveLimits,
    getLimitsHandler: routes.getLimits,
    setLimitHandler: routes.setLimit,
    cancelLimitHandler: routes.cancelLimit,
    raiseLimitHandler: routes.raiseLimit,
  },
};
