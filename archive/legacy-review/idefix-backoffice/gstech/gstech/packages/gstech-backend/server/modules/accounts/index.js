/* @flow */
const Account = require('./Account');
const routes = require('./routes');
const { getAccountHandler, updateAccountHolderHandler, updateAccountParametersHandler } = require('./api-routes');

module.exports = {
  getAccount: Account.getAccount,
  getAccountWithParameters: Account.getAccountWithParameters,
  getAccounts: Account.getAccounts,
  findOrCreateAccount: Account.findOrCreateAccount,
  updateAccount: Account.updateAccount,
  getAccountsWithKycData: Account.getAccountsWithKycData,
  updateAccountParameters: Account.updateAccountParameters,
  apiRoutes: {
    getAccountHandler,
    updateAccountHolderHandler,
    updateAccountParametersHandler,
    addAccountHandler: routes.addAccountHandler,
  },
  routes: {
    getAccountsHandler: routes.getAccountsHandler,
    updateAccountDocumentHandler: routes.updateAccountDocumentHandler,
    addAccountDocumentHandler: routes.addAccountDocumentHandler,
    removeAccountDocumentHandler: routes.removeAccountDocumentHandler,

    updateAccountHandler: routes.updateAccountHandler,
    addAccountHandler: routes.addAccountHandler,
  },
};
