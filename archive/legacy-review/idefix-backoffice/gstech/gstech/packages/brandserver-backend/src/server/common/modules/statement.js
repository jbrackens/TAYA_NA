/* @flow */
import type { Transaction } from "gstech-core/modules/clients/backend-api-types";

const { stringExcel: stringExcelFormatter } = require('@json2csv/formatters');
const { Parser } = require('@json2csv/plainjs');
const moment = require('moment-timezone');
const includes = require('lodash/includes');
const api = require('../api');
const { localize } = require('./localize');
const { money } = require('../money');
const { handleError } = require('../extensions');

const getStatement = async (req: express$Request) => {
  const s = await api.accountStatement(req);
  const payments = s.statement.map(tx => ({
    Amount: money(req, tx.amount, s.balance.currencyId),
    PaymentMethodName: tx.paymentMethod === 'WorldPay' ? tx.account : localize(req, `my-account.deposit.payment-method.${tx.paymentMethod.split('_')[0]}`, false) || tx.paymentMethod, // # WebDollar legacy
    UniqueTransactionID: tx.transactionKey,
    Timestamp: moment
      .tz(tx.timestamp, 'Europe/Malta')
      .locale(req.context.languageISO)
      .format('lll'),
    TransactionTypeName: localize(req, `my-account.history.${tx.paymentType.toLowerCase()}`, false) || tx.paymentType,
  }));

  const summary = {
    deposits: money(req, s.summary.totalDepositAmount, s.balance.currencyId),
    withdrawals: money(req, s.summary.totalWithdrawalAmount, s.balance.currencyId),
    total: money(req, s.summary.totalWithdrawalAmount - s.summary.totalDepositAmount, s.balance.currencyId),
  };
  const transactions = s.transactions.map(month => ({
    month,
    text: moment(month, 'YYYYMM')
      .locale(req.context.languageISO)
      .format('MMM YYYY'),
  }));
  return { payments, summary, transactions };
};

const getTransactions = async (req: express$Request, month: string) => {
  const tx = await api.getTransactions(req, month);
  const csvMap = (row: Transaction) => ({
    id: row.transactionId,
    timestamp: moment(row.date).format('YYYY-MM-DD HH:mm:ss'),
    type: localize(req, `transaction.${row.type}`, false) || row.type,
    amount: money(req, row.amount + row.bonusAmount, req.context.currencyISO),
    balance: money(req, row.realBalance + row.bonusBalance, req.context.currencyISO),
    description: includes(['wallet_deposit', 'wallet_withdrawal'], row.type) && row.description != null ? localize(req, `my-account.deposit.payment-method.${row.description.split('/')[0]}`, false) || row.description : row.description,
  });
  return tx.map(csvMap);
};


const getStatementHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const st = await getStatement(req);
    return res.json(st);
  } catch (e) {
    return handleError(req, res, e);
  }
}

const getTransactionsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<void> | Promise<express$Response> => {
  try {
    const data = await getTransactions(req, req.params.month);
    if (data.length === 0) {
      return next('404');
    }
    res.attachment(`transactions-${req.params.month}.csv`);
    res.type('text/csv');
    const fields = ['id', 'timestamp', 'type', 'amount', 'balance', 'description'];
    const csv = new Parser({ fields, fomatters: { string: stringExcelFormatter } });
    const result = csv.parse(data);
    res.send(result);
    res.end();
  } catch (e) {
    return handleError(req, res, e);
  }
};

module.exports = { getStatementHandler, getTransactionsHandler };
