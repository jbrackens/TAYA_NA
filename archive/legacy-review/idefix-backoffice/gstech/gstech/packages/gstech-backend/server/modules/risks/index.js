/* @flow */
const {
  getPlayerRiskLevelHandler,
  getPlayerRiskStatusHandler,
  getPlayerRiskLogHandler,
  getRisksHandler,
  createRiskHandler,
  updateRiskHandler,
} = require('./routes');

const { getRiskTypes } = require('./Risk');

module.exports =
{
  getRiskTypes,
  routes: {
    getPlayerRiskLevelHandler,
    getPlayerRiskStatusHandler,
    getPlayerRiskLogHandler,
    getRisksHandler,
    createRiskHandler,
    updateRiskHandler,
  }
};
