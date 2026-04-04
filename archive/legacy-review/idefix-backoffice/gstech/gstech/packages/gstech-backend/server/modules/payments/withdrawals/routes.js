/* @flow */
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const { getPaymentEvents } = require('../Payment');
const { getWithdrawalInfo, getWithdrawalWithOptions, acceptWithdrawal, acceptWithdrawalWithDelay, getPendingWithdrawals, cancelWithdrawal, processWithdrawal, markWithdrawalAsComplete } = require('./Withdrawal');
const { currentStatus } = require('../../players');
const { withdrawalSchema, playerPendingWithdrawalSchema, confirmWithdrawalSchema } = require('./schemas');

const getWithdrawalInfoHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId }: { playerId: Id } = (req.params: any);
    const withdrawalInfo = await getWithdrawalInfo(playerId);
    return res.json(withdrawalInfo);
  } catch (err) {
    logger.warn('getWithdrawalHandler failed', err);
    return next(err);
  }
};

const getWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await getWithdrawalWithOptions(req.params.withdrawalId);
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Get withdrawal failed');
    return next(err);
  }
};

const acceptWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentProviderId, amount, parameters } = await validate(req.body, withdrawalSchema, 'Accept withdrawal failed');
    const playerId = Number(req.params.playerId);
    const { withdrawalId } = req.params;
    logger.debug('acceptWithdrawalHandler', req.userSession.id, { playerId, withdrawalId, paymentProviderId, amount, parameters });
    await acceptWithdrawal(withdrawalId, paymentProviderId, amount, req.userSession.id, playerId, parameters);
    const result = {
      withdrawalId,
      paymentProviderId,
      amount,
    };
    logger.debug('acceptWithdrawalHandler result', result);
    return res.status(200).json(result);
  } catch (err) {
    logger.warn('Accept withdrawal failed', err, req.body);
    return next(err);
  }
};

const acceptWithdrawalWithDelayHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { paymentProviderId, amount, parameters } = await validate(req.body, withdrawalSchema, 'Accept withdrawal with delay failed');
    const playerId = Number(req.params.playerId);
    const { withdrawalId } = req.params;

    await acceptWithdrawalWithDelay(withdrawalId, paymentProviderId, amount, req.userSession.id, playerId, parameters);
    return res.status(200).json({
      withdrawalId,
      paymentProviderId,
      amount,
    });
  } catch (err) {
    logger.warn('Accept withdrawal with delay failed', err, req.body);
    return next(err);
  }
};

const getWithdrawalEventsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const events = await getPaymentEvents(req.params.withdrawalId);
    return res.json(events);
  } catch (err) {
    logger.warn('Get withdrawal events failed', err);
    return next(err);
  }
};

const cancelPlayerPendingWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId, transactionKey } = await validate(req.body, playerPendingWithdrawalSchema, 'Cancel player pending withdrawal failed');

    const cancelled = await cancelWithdrawal(playerId, transactionKey, req.userSession.id);
    const withdrawals = await getPendingWithdrawals(playerId);
    const update = await currentStatus(playerId);
    return res.json({ cancelled, withdrawals, update });
  } catch (err) {
    logger.warn('Cancel player pending withdrawal failed');
    return next(err);
  }
};

const confirmWithdrawalHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { externalTransactionId } = await validate(req.body, confirmWithdrawalSchema, 'Confirm withdrawal failed');
    const { withdrawalId } = req.params;
    const message = 'Confirmed manually';

    await processWithdrawal(withdrawalId, message, {}, {}, req.userSession.id);
    const complete = await markWithdrawalAsComplete(withdrawalId, externalTransactionId, message, {});

    return res.json({ complete });
  } catch (e) {
    logger.warn('confirmWithdrawalHandler failed', e);
    return next(e);
  }
}

module.exports = {
  getWithdrawalInfoHandler,
  getWithdrawalHandler,
  getWithdrawalEventsHandler,
  acceptWithdrawalHandler,
  acceptWithdrawalWithDelayHandler,
  cancelPlayerPendingWithdrawalHandler,
  confirmWithdrawalHandler,
};
