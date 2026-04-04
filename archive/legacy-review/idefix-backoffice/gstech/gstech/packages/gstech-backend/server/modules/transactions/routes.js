/* @flow */
import type {
  Transaction as $Transaction,
  TxType,
  TransactionSummary,
} from 'gstech-core/modules/clients/backend-api-types';

const includes = require('lodash/fp/includes');
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const joi = require('gstech-core/modules/joi');
const Player = require('../players/Player');
const Transaction = require('./Transaction');
const { formatMoney } = require('../core/money');

const types = {
  wallet_deposit: 'Deposit',
  wallet_withdrawal: 'Withdraw',
  wallet_withdrawal_processed: 'Withdrawal processed',
  wallet_correction: 'Correction',
  wallet_compensation: 'Compensation',
  wallet_transaction_fee: 'Transaction fee',
  wallet_transaction_fee_return: 'Returned transaction fee',
  wallet_cancel_withdrawal: 'Cancel Withdrawal',
  bonus_credit: 'Credit bonus',
  turn_bonus_to_real: 'Bonus turned real',
  bonus_forfeit: 'Forfeit bonus',
  bonus_lost: 'Bonus lost',
  bet: 'Bet',
  win: 'Win',
  win_jackpot: 'Jackpot',
  win_local_jackpot: 'Local Jackpot',
  win_freespins: 'Freespins',
  cancel_bet: 'Cancelled Bet',
  cancel_win: 'Cancelled Win',
};

const bonusDebitType = [
  'turn_bonus_to_real',
];

const creditType = [
  'turn_bonus_to_real',
  'wallet_deposit',
  'wallet_correction',
  'wallet_compensation',
  'wallet_transaction_fee_return',
  'wallet_cancel_withdrawal',
  'bonus_credit',
  'win',
  'win_jackpot',
  'win_local_jackpot',
  'win_freespins',
  'cancel_bet',
];

const formatSign = (amount: Money, type: TxType) => (includes<TxType>(type)(creditType) ? amount : -amount);
const formatAmount = (amount: Money, type: TxType, currencyId: string) => formatMoney(formatSign(amount, type), currencyId);

const formatBonusAmount = (amount: Money, type: TxType, currencyId: string) => {
  if (includes<TxType>(type)(bonusDebitType)) {
    return formatMoney(-amount, currencyId);
  }
  return formatAmount(amount, type, currencyId);
};

const mapTransaction = (currencyId: string) => (tx: $Transaction) =>
  ({
    ...tx,
    amount: formatAmount(tx.amount, tx.type, currencyId),
    bonusAmount: formatBonusAmount(tx.bonusAmount, tx.type, currencyId),
    bonusBalance: formatMoney(tx.bonusBalance, currencyId),
    realBalance: formatMoney(tx.realBalance, currencyId),
    rawAmount: formatSign(tx.amount, tx.type),
    rawBonusAmount: formatSign(tx.bonusAmount, tx.type),
    rawBonusBalance: tx.bonusBalance,
    rawRealBalance: tx.realBalance,
    type: types[tx.type] || tx.type,
  });

type FormattedTransactionSummary = {
  ...TransactionSummary,
  realBets: string,
  bonusBets: string,
  realWins: string,
  bonusWins: string,
  averageBet: string,
  biggestWin: string,
}

const mapSummary =
  (currencyId: string) =>
  (row: TransactionSummary): FormattedTransactionSummary => ({
    ...row,
    realBets: formatMoney(row.realBets, currencyId),
    bonusBets: formatMoney(row.bonusBets, currencyId),
    realWins: formatMoney(row.realWins, currencyId),
    bonusWins: formatMoney(row.bonusWins, currencyId),
    averageBet: formatMoney(row.averageBet, currencyId),
    biggestWin: formatMoney(row.biggestWin, currencyId),
  });

const transactionDateRangeQuery = joi.object({
  startDate: joi.date().required(),
  endDate: joi.date().required(),
  text: joi.string().allow('').optional(),
  pageIndex: joi.number().integer().default(0),
  pageSize: joi.number().integer().optional(),
  sortBy: joi
    .string()
    .trim()
    .valid('name', 'date', 'id')
    .optional()
    .allow(null, '')
    .when('.', { is: joi.valid('', null), then: joi.strip() }),
  sortDirection: joi
    .string()
    .trim()
    .uppercase()
    .valid('ASC', 'DESC')
    .optional()
    .default('DESC')
    .when('sortBy', { is: joi.valid('', null), then: joi.strip() }),
});

const getTransactionDates = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;

    const dates = await Transaction.getTransactionDates(Number(playerId));
    return res.status(200).json({ dates });
  } catch (err) {
    logger.warn('Get getTransactionDates failed');
    return next(err);
  }
};

const getTransactions = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId } = req.params;
    const { startDate, endDate, pageIndex, pageSize, text, sortBy, sortDirection } = await validate(req.query, transactionDateRangeQuery, 'Invalid transaction date range');
    const paging = pageSize && { pageIndex, pageSize };
    const filter = { startDate, endDate, text };
    const sorting = { sortBy, sortDirection };

    const transactions = await Transaction.getTransactions(Number(playerId), filter, paging, sorting);
    const { currencyId } = await Player.getBalance(Number(playerId));
    const result = transactions.map(mapTransaction(currencyId));
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get transactions failed');
    return next(err);
  }
};

const getTransactionsSummary = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { startDate, endDate } = await validate(req.query, transactionDateRangeQuery, 'Invalid transaction summary date range');
    if (moment(startDate).diff(endDate, 'months') > 0) {
      return res.status(200).json([]);
    }
    const summary = await Transaction.getSummary(Number(playerId), startDate, endDate);
    const { currencyId } = await Player.getBalance(Number(playerId));
    return res.status(200).json(summary.map(mapSummary(currencyId)));
  } catch (err) {
    logger.warn('Get transaction summary failed');
    return next(err);
  }
};

module.exports = {
  getTransactions,
  getTransactionDates,
  getTransactionsSummary,
};
