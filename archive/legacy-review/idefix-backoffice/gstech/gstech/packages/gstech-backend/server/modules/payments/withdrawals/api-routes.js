/* @flow */
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const { Money } = require('gstech-core/modules/money-class');

const { getActiveCounters } = require('../../limits/Counter');
const Payment = require('../Payment');
const { addPlayerFraud } = require('../../frauds');
const { getCurrencies } = require('../../settings/Currencies');

const { getWithdrawalInfo, getWithdrawal, getPendingWithdrawals, getWithdrawalStatus, createWithdrawal, cancelWithdrawal, markWithdrawalAsComplete, rejectFailedWithdrawal } = require('./Withdrawal');
const { getBalance, getPlayerWithDetails } = require('../../players');
const { requestWithdrawalSchema, setWithdrawalStatusSchema } = require('./schemas');
const { calculateWithdrawalFee } = require('./calculator');

const getWithdrawalInfoHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const withdrawalInfo = await getWithdrawalInfo(req.session.playerId);
    return res.json(withdrawalInfo);
  } catch (e) {
    logger.warn('getWithdrawalHandler failed', e);
    return next(e);
  }
};

const getPendingWithdrawalsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const withdrawals = await getPendingWithdrawals(req.session.playerId);
    const balance = await getBalance(req.session.playerId);
    return res.json({ withdrawals, balance });
  } catch (e) {
    logger.warn('getPendingWithdrawalsHandler failed', e);
    return next(e);
  }
};

const getWithdrawalStatusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const withdrawal = await getWithdrawalStatus(req.session.playerId, req.params.transactionKey);
    const balance = await getBalance(req.session.playerId);
    return res.json({ withdrawal, balance });
  } catch (e) {
    logger.warn('getWithdrawalStatusHandler failed', e);
    return next(e);
  }
};

const getWithdrawalDetailsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const withdrawal = await getWithdrawal(req.params.transactionKey);
    if (!withdrawal) {
      return res.status(404).json({ error: errorCodes.WITHDRAWAL_NOT_FOUND });
    }
    const balance = await getBalance(withdrawal.playerId);
    const player = await getPlayerWithDetails(withdrawal.playerId);
    return res.json({ withdrawal, balance, player }); // TODO: this returns now something not matching the type. Should be mapped to Withdrawal type
  } catch (e) {
    logger.warn('getWithdrawalDetailsHandler failed', e);
    return next(e);
  }
};

const requestWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const withdrawal = await validate(req.body, requestWithdrawalSchema, 'Withdrawal request failed');
    const withdrawalInfo = await getWithdrawalInfo(req.session.playerId);
    if (!withdrawalInfo.withdrawalAllowed) {
      return res.status(400).json({ error: errorCodes.WITHDRAWALS_NOT_ALLOWED });
    }

    try {
      const { brandId }: { brandId: BrandId } = (req.params: any);
      const { playerId } = req.session;
      const { currencyId } = await getBalance(playerId);

      const counters = await getActiveCounters(playerId, ['deposit_wager']);
      if (counters.length > 0) {
        const payments = await Payment.payments(playerId);
        const lastDeposit = payments.find(p => p.paymentType === 'deposit' && p.status === 'complete');

        if (lastDeposit) {
          const currencies = await getCurrencies(brandId);
          const { defaultConversion = 1 } = currencies.find(c => c.id === currencyId) || { };

          if (lastDeposit.amount >= 200000 * defaultConversion) {
            await addPlayerFraud(playerId, 'big_wd_deposit_not_wagered','');
          }
        }
      }

      const amount = new Money(withdrawal.amount, currencyId);
      const fee = withdrawal.noFee ? new Money(0, currencyId) : await calculateWithdrawalFee(brandId, playerId, amount, currencyId, counters);
      const newAmount = amount.subtract(fee);
      const id = await createWithdrawal(req.session.playerId, req.session.id, withdrawal.accountId, newAmount.asFixed(), fee.asFixed());
      const withdrawals = await getPendingWithdrawals(req.session.playerId);
      const balance = await getBalance(req.session.playerId);

      return res.json({ withdrawal: { id }, withdrawals, balance });
    } catch (e) {
      return res.status(400).json(e);
    }
  } catch (e) {
    if (e.message.includes('amount')) {
      return res.status(400).json({ error: errorCodes.INVALID_WITHDRAWAL_ACCOUNT });
    } if (e.message.includes('accountId')) {
      return res.status(400).json({ error: errorCodes.INVALID_WITHDRAWAL_ACCOUNT });
    }

    logger.warn('requestWithdrawalHandler failed', e);
    return next(e);
  }
};

const cancelPendingWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const cancelled = await cancelWithdrawal(req.session.playerId, req.params.transactionKey);
    const withdrawals = await getPendingWithdrawals(req.session.playerId);
    const balance = await getBalance(req.session.playerId);
    return res.json({ cancelled, withdrawals, balance });
  } catch (e) {
    logger.warn('cancelPendingWithdrawalHandler failed', e);
    return next(e);
  }
};

const setWithdrawalStatusHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const wd = await validate(req.body, setWithdrawalStatusSchema, 'Set withdrawal status failed');
    if (req.params.status === 'complete') {
      const complete = await markWithdrawalAsComplete(req.params.transactionKey, wd.externalTransactionId, wd.message, wd.rawTransaction, wd.paymentCost);
      return res.json({ complete });
    }
    if (req.params.status === 'failed') {
      const failed = await rejectFailedWithdrawal(req.params.transactionKey, wd.message, wd.rawTransaction);
      return res.json({ failed });
    }
    return next(new Error(`Status not supported ${req.params.status}`));
  } catch (e) {
    logger.warn('setWithdrawalStatusHandler failed', e);
    return next(e);
  }
};

module.exports = {
  getWithdrawalInfoHandler,
  requestWithdrawalHandler,
  getPendingWithdrawalsHandler,
  getWithdrawalStatusHandler,
  getWithdrawalDetailsHandler,
  cancelPendingWithdrawalHandler,
  setWithdrawalStatusHandler,
};
