/* @flow */
import type { Money } from 'gstech-core/modules/money-class';
import type { Balance, ExtendedBalance } from './types';

const api = require('../../api');
const biApi = require('../../bi-api');
const logger = require('../../logger');
const { mapBalance } = require('./helper');
const { handleError } = require('../../extensions');
const { BalanceInfo } = require('../../balance-info');
const { getNumberOfPendingWithdrawals } = require('../withdraw');

const getPlayerBalance = async (req: express$Request): Promise<Balance> =>
  api.PlayerGetBalance({ sessionKey: req.session.SessionKey });

const getFullBalance = async (req: express$Request): Promise<ExtendedBalance> => {
  const b = await getPlayerBalance(req);
  return mapBalance(req, b);
};

const adjustRealMoney = (req: express$Request, amount: Money, transactionType: 'Compensation' | 'Correction', reason: string): Promise<any> => {
  logger.debug('adjustRealMoney', req.user.username, { amount, transactionType, reason });
  return biApi.TransactionAdjustRealMoney(req, { amount, transactionType, reason });
};

const getBalanceHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const [balance, pendingWithdraws] = await Promise.all([getFullBalance(req), getNumberOfPendingWithdrawals(req)]);

    return res.json({
      update: {
        balance: balance.ui,
        pendingWithdraws,
      },
      depleted: new BalanceInfo(balance).isDepleted(0),
    });
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = {
  getFullBalance,
  getPlayerBalance,
  adjustRealMoney,
  getBalanceHandler,
};
