/* @flow */
import type { Payment as $Payment } from "./Payment";

const Boom = require('@hapi/boom');
const values = require('lodash/fp/values');
const keys = require('lodash/fp/keys');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const joi = require('gstech-core/modules/joi');
const { Money } = require('gstech-core/modules/money-class');
const { parseDateTimeQuery } = require('gstech-core/modules/utils');
const Withdrawal = require('./withdrawals/Withdrawal');
const { getBalance } = require('../players');
const { setDepositWageringCounter, disableDepositWageringCounter } = require('../limits');
const { getActiveCounters } = require('../limits/Counter');
const Payment = require('./Payment');
const Player = require('../players');
const { formatMoney } = require('../core/money');
const { transactionSchema, updateDepositSchema, completeDepositSchema } = require('./schemas');
const { processDeposit, getRawDeposit, getRawDepositById } = require('./deposits/Deposit');
const { getPreviousDeposit } = require('./deposits/DepositInfo');
const { calculateWithdrawalFee } = require('./withdrawals/calculator');

const mapStatus = {
  created: 'created',
  pending: 'pending',
  accepted: 'pending',
  processing: 'pending',
  complete: 'complete',
  settled: 'complete',
  failed: 'failed',
  expired: 'failed',
  cancelled: 'cancelled',
};

const mapPaymentTransaction = (currencyId: string) => (tx: $Payment) => {
  const t1 = {
    counterTarget: tx.counterTarget,
    counterValue: tx.counterValue,
    counterId: tx.counterId,
    value: (tx.counterTarget || 0 - tx.counterValue || 0),
    type: 'deposit',
  };
  const t2 = {
    counterTarget: tx.campaignTarget,
    counterValue: tx.campaignValue,
    counterId: tx.campaignId,
    value: (tx.campaignTarget || 0 - tx.campaignValue || 0),
    type: 'campaign',
  };

  let max = t1.counterId ? t1 : t2;
  if (t2.counterId != null) {
    if (t2.value > max.value) {
      max = t2;
    }
  }

  return {
    id: tx.transactionId,
    key: tx.transactionKey,
    date: tx.timestamp,
    type: tx.paymentType,
    paymentId: tx.paymentId,
    status: tx.status,
    statusGroup: mapStatus[tx.status],
    provider: [tx.paymentMethod, tx.name].filter(x => x !== null).join('/'),
    bonus: tx.bonus,
    account: tx.account,
    amount: formatMoney(tx.amount, currencyId),
    rawAmount: tx.amount,
    paymentFee: formatMoney(tx.paymentFee),
    rawPaymentFee: tx.paymentFee || 0,
    transactionId: tx.externalTransactionId,
    counterTarget: max.counterTarget,
    counterValue: max.counterValue,
    counterId: max.counterId,
    counterType: max.type,
  };
};

const getPaymentsQuery = joi.object({
  pageIndex: joi.number().integer().default(0),
  pageSize: joi.number().integer().optional(),
  text: joi.string().allow('').optional(),
  status: joi
    .queryParam()
    .items(joi.valid(...values(mapStatus)))
    .optional(),
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

const getPaymentsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const { pageIndex, pageSize, status, text, sortBy, sortDirection } = await validate(req.query, getPaymentsQuery, 'Schema validation failed');
    const paging = pageSize && { pageIndex, pageSize };
    const mappedStatuses = status ? keys(mapStatus).filter((s) => status.includes(mapStatus[s])) : undefined;
    const sorting = { sortBy, sortDirection };
    const filter = text ? parseDateTimeQuery(text) : {};
    const transactions = await Payment.payments(playerId, paging, mappedStatuses, filter, sorting);
    const { currencyId } = await Player.getBalance(playerId);
    const result = transactions.map(mapPaymentTransaction(currencyId));
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get payment transactions failed', err);
    return next(err);
  }
};

const getPaymentEventsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const paymentId = Number(req.params.paymentId);
    const events = await Payment.paymentEvents(playerId, paymentId);
    return res.status(200).json(events);
  } catch (err) {
    logger.warn('Get payment transactions failed');
    return next(err);
  }
};

const addPaymentTransactionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const transactionDraft = await validate(req.body, transactionSchema, 'Add payment transaction failed');
    const sessionId = req.session && req.session.id;
    if (transactionDraft.type === 'correction' || transactionDraft.type === 'compensation') {
      await pg.transaction(async tx =>
        Payment.addTransaction(Number(req.params.playerId), sessionId, transactionDraft.type, transactionDraft.amount, transactionDraft.reason, req.userSession.id, tx));
      const update = await Player.currentStatus(Number(req.params.playerId));
      return res.status(200).json({ update });
    } if (transactionDraft.type === 'withdraw') {

      const playerId = Number(req.params.playerId);
      const { currencyId, brandId } = await getBalance(playerId);
      const amount = new Money(transactionDraft.amount, currencyId);

      const counters = await getActiveCounters(playerId, ['deposit_wager']);
      const fee = transactionDraft.noFee ? new Money(0, currencyId) : await calculateWithdrawalFee(brandId, playerId, amount, currencyId, counters);

      await pg.transaction(async tx =>
        Withdrawal.addWithdrawal(Number(req.params.playerId), sessionId, transactionDraft.accountId, amount.subtract(fee).asFixed(), fee.asFixed(), transactionDraft.reason, req.userSession.id, null, tx));
      const update = await Player.currentStatus(Number(req.params.playerId));
      return res.status(200).json({ update });
    }
    return next(Boom.badRequest(`Invalid transaction type: ${transactionDraft.type}`));
  } catch (err) {
    if (err.constraint === 'players_balance_check') {
      return next(Boom.badRequest('Not enough balance'));
    }
    logger.warn('Add payment transaction failed', err);
    return next(err);
  }
};

const updateDepositWageringRequirementHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const updateDepositDraft = await validate(req.body, updateDepositSchema, 'Update deposit wagering requirement failed');
    await pg.transaction(async (tx) => {
      let counter;
      if (updateDepositDraft.wageringRequirement === 0) {
        [counter] = await disableDepositWageringCounter(Number(req.params.counterId), tx);
      } else {
        [counter] = await setDepositWageringCounter(Number(req.params.counterId), updateDepositDraft.wageringRequirement, tx);
      }
      if (counter != null && counter.paymentId != null) {
        const deposit = await getRawDepositById(counter.paymentId).transacting(tx);
        await Player.addEvent(counter.playerId, req.userSession.id, 'transaction', 'setWagering', { transactionKey: deposit.transactionKey, wr: updateDepositDraft.wageringRequirement, reason: updateDepositDraft.reason }).transacting(tx);
      }
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.warn('updateDepositWageringRequirementHandler failed', e);
    return next(e);
  }
};

const completeDepositHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { transactionKey } = req.params;
    const { externalTransactionId, reason } = await validate(req.body, completeDepositSchema, 'Complete deposit failed');
    const d = await getRawDeposit(transactionKey);
    const previous = await getPreviousDeposit(d.playerId).where({ 'payments.paymentMethodId': d.paymentMethodId });
    if (previous != null && previous.accountId != null) {
      await pg('payments').update({ accountId: previous.accountId }).where({ transactionKey }).whereNotNull('accountId');
    }

    await processDeposit(
      null,
      transactionKey,
      null,
      null,
      externalTransactionId,
      'complete',
      reason,
      null,
      null,
      null,
      null,
      null,
      req.userSession.id,
    );

    return res.json({ ok: true });
  } catch (e) {
    logger.warn('completeDepositHandler failed', e);
    return next(e);
  }
};

module.exports = {
  addPaymentTransactionHandler,
  updateDepositWageringRequirementHandler,
  completeDepositHandler,
  getPaymentsHandler,
  getPaymentEventsHandler,
};
