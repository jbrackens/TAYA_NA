/* @flow */
const {
  adjustDepositWageringRequirementHandler,
  createDepositWageringRequirementHandler,
  getDepositInfoHandler,
  getPnpEURDepositInfoHandler,
  startDepositHandler,
  getDepositHandler,
  updateDepositHandler,
  processDepositHandler,
  setDepositStatusHandler,
  executeDepositHandler,
} = require('./deposits/api-routes');
const {
  getWithdrawalInfoHandler,
  requestWithdrawalHandler,
  getPendingWithdrawalsHandler,
  getWithdrawalStatusHandler,
  cancelPendingWithdrawalHandler,
  setWithdrawalStatusHandler,
  getWithdrawalDetailsHandler,
} = require('./withdrawals/api-routes');
const {
  getWithdrawalInfoHandler: getWithdrawalInfoRoutesHandler,
  getWithdrawalHandler,
  acceptWithdrawalHandler,
  acceptWithdrawalWithDelayHandler,
  cancelPlayerPendingWithdrawalHandler,
  getWithdrawalEventsHandler,
  confirmWithdrawalHandler,
} = require('./withdrawals/routes');
const {
  getPaymentsHandler,
  getPaymentEventsHandler,
  addPaymentTransactionHandler,
  updateDepositWageringRequirementHandler,
  completeDepositHandler,
} = require('./routes');
const {
  accountStatementHandler,
  accountMonthlyStatementHandler,
  accountDepositsHandler,
  createTransactionHandler,
  getConversionRatesHandler,
  queryForPaymentsHandler
} = require('./api-routes');

module.exports = {
  routes: {
    getPaymentsHandler,
    getPaymentEventsHandler,
    cancelPlayerPendingWithdrawalHandler,
    addPaymentTransactionHandler,
    getWithdrawalInfoHandler: getWithdrawalInfoRoutesHandler,
    getWithdrawalHandler,
    getWithdrawalEventsHandler,
    acceptWithdrawalHandler,
    acceptWithdrawalWithDelayHandler,
    confirmWithdrawalHandler,
    updateDepositWageringRequirementHandler,
    completeDepositHandler,
  },

  apiRoutes: {
    accountStatementHandler,
    accountMonthlyStatementHandler,
    accountDepositsHandler,
    createTransactionHandler,
    cancelPendingWithdrawalHandler,
    getDepositInfoHandler,
    getPnpEURDepositInfoHandler,
    processDepositHandler,
    updateDepositHandler,
    setDepositStatusHandler,
    getDepositHandler,
    startDepositHandler,
    getWithdrawalInfoHandler,
    requestWithdrawalHandler,
    getPendingWithdrawalsHandler,
    getWithdrawalStatusHandler,
    setWithdrawalStatusHandler,
    getWithdrawalDetailsHandler,
    adjustDepositWageringRequirementHandler,
    createDepositWageringRequirementHandler,
    executeDepositHandler,
    getConversionRatesHandler,
    queryForPaymentsHandler
  },
};
