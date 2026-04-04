/* @flow */

const Fraud = require('./Fraud');
const { addPlayerFraudHandler, addPlayerFraudByUsernameHandler } = require('./api-routes');
const { getPlayerFraudHandler, checkPlayerFraudHandler, createPlayerFraudHandler } = require('./routes');
const { matchName } = require('./matcher');

module.exports = {
  addPlayerFraud: Fraud.addPlayerFraud,
  addPlayerFraudTx: Fraud.addPlayerFraudTx,
  applyMultipleSanction: Fraud.applyMultipleSanction,
  checkRegistrationFrauds: Fraud.checkRegistrationFrauds,
  checkIpFraud: Fraud.checkIpFraud,
  matchName,
  apiRoutes: {
    addPlayerFraudHandler,
    addPlayerFraudByUsernameHandler,
  },
  routes: {
    createPlayerFraudHandler,
    getPlayerFraudHandler,
    checkPlayerFraudHandler,
  },
};
