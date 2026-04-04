/* @flow */
const walletRoutes = require('./wallet-routes');
const routes = require('./routes');

module.exports = {
  routes: {
    getTicketHandler: routes.getTicketHandler,
  },
  apiRoutes: {

  },
  walletRoutes: {
    createOrUpdateTicketHandler: walletRoutes.createOrUpdateTicketHandler,
  },
};
