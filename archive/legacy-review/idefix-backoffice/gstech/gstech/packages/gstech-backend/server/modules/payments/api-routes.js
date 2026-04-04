/* @flow */
const moment = require('moment-timezone');
const joi = require('gstech-core/modules/joi');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const Payment = require('./Payment');
const { getBalance } = require('../players');
const { getTransactions } = require('../transactions');
const PlayerTransactionReport = require('../reports/PlayerTransactionReport');
const { doMaintenance } = require('../bonuses');
const { getCurrentRates } = require('../settings/ConversionRates');

const accountStatementQuerySchema = joi
  .object({
    items: joi.number().integer().positive().default(100),
    page: joi.number().integer().positive().default(0),
  })
  .required();

const accountStatementHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('accountStatementHandler', { body: req.body });
    const query = await validate(
      req.body,
      accountStatementQuerySchema,
      'accountStatementHandler failed',
    );
    const statement = await Payment.statement(req.session.playerId, query.items, query.page);
    const summary = await Payment.getPaymentInfo(req.session.playerId);
    const transactions = await PlayerTransactionReport.availableMonths(req.session.playerId);
    const balance = await getBalance(req.session.playerId);
    logger.debug('accountStatementHandler', { statement, balance, summary, transactions });
    return res.json({ statement, balance, summary, transactions });
  } catch (e) {
    logger.warn('accountStatementHandler failed');
    return next(e);
  }
};

const accountMonthlyStatementSchema = joi
  .object({
    month: joi
      .string()
      .trim()
      .regex(/\d\d\d\d\d\d/),
  })
  .required();

const accountMonthlyStatementHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('accountMonthlyStatementHandler', { body: req.body });
    const { month } = await validate(
      { month: req.params.month },
      accountMonthlyStatementSchema,
      'accountMonthlyStatementHandler failed',
    );
    const monthStart = moment(month, 'YYYYMM').startOf('month').toDate();
    const monthEnd = moment(monthStart).endOf('month').toDate();

    const data = await getTransactions(req.session.playerId, {
      startDate: monthStart,
      endDate: monthEnd,
    });

    return res.json(data);
  } catch (e) {
    logger.warn('accountStatementHandler failed');
    return next(e);
  }
};

const accountDepositsHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const query = await validate(
      req.body,
      accountStatementQuerySchema,
      'accountDepositsHandler failed',
    );
    const deposits = await Payment.deposits(req.session.playerId, query.items, query.page);
    const balance = await getBalance(req.session.playerId);
    return res.json({ deposits, balance });
  } catch (e) {
    logger.warn('accountDepositsHandler failed');
    return next(e);
  }
};

const createTransactionHandlerSchema = joi
  .object({
    amount: joi.number().integer(),
    transactionType: joi.number().valid('correction', 'compensation').default('compensation'),
    reason: joi.string().trim().required(),
  })
  .required();

const createTransactionHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const tx = await validate(req.body, createTransactionHandlerSchema, 'createTransaction failed');
    const transaction = await pg.transaction(async (t) => {
      await doMaintenance(req.session.playerId, t);
      return await Payment.addTransaction(
        req.session.playerId,
        req.session.id,
        tx.transactionType,
        tx.amount,
        tx.reason,
        null,
        t,
      );
    });

    const balance = await getBalance(req.session.playerId);
    return res.json({ transaction, balance });
  } catch (e) {
    logger.warn('create transaction failed');
    return next(e);
  }
};

const getConversionRatesHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> getConversionRatesHandler');
    const conversionRates = await getCurrentRates();
    logger.debug('<<< getConversionRatesHandler', { conversionRates });
    return res.json({ conversionRates });
  } catch (err) {
    logger.error('XXX getConversionRatesHandler', { err });
    return next(err);
  }
};

const queryForPaymentsHandlerSchema = joi
  .object({
    startDate: joi.date().required(),
    endDate: joi.date().optional(),
    paymentType: joi.string().trim().required(),
    paymentStatus: joi.string().trim().optional(),
    psp: joi.object({
      provider: joi.string().trim().required(),
      method: joi.string().trim().required(),
    }).optional(),
    parameters: joi.object().optional(),
  })
  .required();

const queryForPaymentsHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> queryForPaymentsHandler');
    const query = await validate(req.body, queryForPaymentsHandlerSchema, 'queryPayments validation failed');
    const payments = await Payment.queryForPayments(query);
    logger.debug('<<< queryForPaymentsHandler', { payments });
    return res.json(payments);
  } catch (err) {
    logger.error('XXX queryForPaymentsHandler', { err });
    return next(err);
  }
}

module.exports = {
  accountStatementHandler,
  accountMonthlyStatementHandler,
  accountDepositsHandler,
  createTransactionHandler,
  getConversionRatesHandler,
  queryForPaymentsHandler
};
