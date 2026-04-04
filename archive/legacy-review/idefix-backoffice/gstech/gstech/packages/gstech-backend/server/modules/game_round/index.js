/* @flow */

const { creditWin, placeBet, cancelTransaction, getTransaction, getRoundTransactions } = require('./GameRound');
const { placeBetHandler, processWinHandler, cancelTransactionHandler, closeRoundHandler, getTransactionHandler, getRoundTransactionsHandler } = require('./wallet-routes');
const { close, refund } = require('./routes');

module.exports = {
  creditWin,
  placeBet,
  cancelTransaction,
  getTransaction,
  getRoundTransactions,
  walletRoutes: {
    processWinHandler,
    placeBetHandler,
    cancelTransactionHandler,
    closeRoundHandler,
    getTransactionHandler,
    getRoundTransactionsHandler,
  },
  routes: {
    refundGameRoundHandler: refund,
    closeGameRoundHandler: close,
  },
};
