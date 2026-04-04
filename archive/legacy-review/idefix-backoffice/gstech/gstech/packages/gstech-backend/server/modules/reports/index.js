/* @flow */
const {
  liabilitiesReportHandler,
  activeUsersReportHandler,
  resultsReportHandler,
  gameTurnoverReportHandler,
  paymentReportHandler,
  paymentSummaryReportHandler,
  dormantPlayersReportHandler,
  withdrawReportHandler,
  pendingWithdrawReportHandler,
  playerRiskStatusReportHandler,
  playerRiskTransactionReportHandler,
  licenseReportHandler,
} = require('./routes');

module.exports = {
  routes: {
    activeUsersReportHandler,
    liabilitiesReportHandler,
    resultsReportHandler,
    gameTurnoverReportHandler,
    paymentReportHandler,
    paymentSummaryReportHandler,
    dormantPlayersReportHandler,
    withdrawReportHandler,
    pendingWithdrawReportHandler,
    playerRiskStatusReportHandler,
    playerRiskTransactionReportHandler,
    licenseReportHandler,
  },
};
