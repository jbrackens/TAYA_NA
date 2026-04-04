/* @flow */
const {
  activateBonus,
  creditBonus,
  getActiveBonuses,
  getAvailableDepositBonuses,
  getAvailablePnpDepositBonusesByBrand,
  forfeitBonus,
  getBonusByCode,
  doMaintenance,
} = require('./Bonus');
const { creditBonusHandler, giveBonusHandler } = require('./api-routes');
const routes = require('./routes');

module.exports = {
  activateBonus,
  creditBonus,
  getActiveBonuses,
  getAvailableDepositBonuses,
  getAvailablePnpDepositBonusesByBrand,
  forfeitBonus,
  doMaintenance,
  getBonusByCode,
  routes: {
    getBonusesHandler: routes.getBonuses,
    getBonusesAvailableHandler: routes.getAvailableBonuses,
    getAvailableBonusesByBrandHandler: routes.getAvailableBonusesByBrand,
    updateBonusHandler: routes.updateBonus,
    createBonusHandler: routes.createBonus,
    getBonusLimitsHandler: routes.getBonusLimits,
    getAvailableBonusLimitsHandler: routes.getAvailableBonusLimits,
    updateBonusLimitsHandler: routes.updateBonusLimits,
    creditBonusHandler: routes.creditBonus,
    forfeitBonusHandler: routes.forfeitBonus,
    archiveBonusHandler: routes.archiveBonus,
  },
  apiRoutes: {
    creditBonusHandler,
    giveBonusHandler,
  },
};
