/* @flow */
import type {DepositMethod} from './Deposit';

const find = require('lodash/find');
const _ = require('lodash');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const paymentServer = require('gstech-core/modules/clients/paymentserver-api');

const { getRawDeposit, getDepositMethods, startDeposit, getDeposit, processDeposit, setDepositStatus } = require('./Deposit');
const { getDepositsLeftAfterPending } = require('../PaymentLimits');
const { getAvailableDepositBonuses, getBonusByCode, getAvailablePnpDepositBonusesByBrand } = require('../../bonuses');
const { getAccountStatus, getBalance, getPlayerById, getPlayerWithDetails, addEvent } = require('../../players');
const { getLimitsWithCounters, depositLimitRemaining } = require('../../limits');
const { validateProviderAccount } = require('../validate');
const { setDepositStatusSchema, updateDepositSchema, processDepositSchema, startDepositSchema, adjustDepositWageringSchema, executeDepositSchema } = require('./schemas');
const { createDepositWageringCounter, adjustDepositWageringCounter } = require('../../limits');
const { getAccount } = require('../../accounts');
const { getBrandInfo } = require('../../settings');

const getDepositInfoHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const accessStatus = await getAccountStatus(req.session.playerId);
    const bonuses = await getAvailableDepositBonuses(req.session.playerId);
    const rawDepositMethods = await getDepositMethods(req.session.playerId);
    const depositLimit = await depositLimitRemaining(req.session.playerId);
    const pendingDeposits = await getDepositsLeftAfterPending(req.session.playerId);
    const limits = await getLimitsWithCounters(req.session.playerId, 'deposit_amount');

    const player = await getPlayerById(req.session.playerId);
    const depositMethods = await Promise.all(rawDepositMethods.map(async (depositMethod) => {
      const { providerId, method, provider, minDeposit, maxDeposit, accountId, account, parameters } = depositMethod;
      const rawAccounts = accountId.map((acc, idx) => ({ accountId: acc, account: account[idx], parameters: parameters[idx] })).filter(a => a.accountId != null);
      const accounts = rawAccounts.filter(acc => validateProviderAccount(player, depositMethod, acc));
      const pendingLeft = _.first(pendingDeposits.filter(x => x.paymentProviderId === providerId).map(x => x.amount));
      return {
        providerId,
        accounts: accounts.filter(a => a.accountId != null).map(acc => ({ accountId: acc.accountId, account: acc.account })),
        method: `${method}_${provider}`,
        lowerLimit: minDeposit,
        upperLimit: Math.min(pendingLeft || depositLimit, Math.min(maxDeposit, depositLimit)),
      };
    }));

    return res.json({
      limits: limits.length > 0 ? limits[0] : null,
      accessStatus,
      bonuses,
      depositMethods,
    });
  } catch (e) {
    logger.warn('getDepositMethods failed', e);
    return next(e);
  }
};

const getPnpEURDepositInfoHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    // PnP API implementation working with EUR currency for now
    const { brandId } = req.params;
    const bonuses = await getAvailablePnpDepositBonusesByBrand(brandId);

    return res.json({
      currencyId: 'EUR',
      bonuses,
    });
  } catch (e) {
    logger.warn('getPnPEURDepositInfoHandler failed', e);
    return next(e);
  }
};

const startDepositHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const deposit = await validate(req.body, startDepositSchema, 'Start deposit failed');

    const depositMethods = await getDepositMethods(req.session.playerId);
    const [depositMethod, depositProvider] = deposit.depositMethod.split('_');
    const selectedMethod: ?DepositMethod = find(depositMethods, ({ provider, method }) => method === depositMethod && provider === depositProvider);

    if (selectedMethod == null) {
      return res.status(400).json({ error: errorCodes.INVALID_PAYMENT_METHOD });
    }
    const accessStatus = await getAccountStatus(req.session.playerId);
    if (!accessStatus.allowTransactions) {
      return res.status(400).json({ error: errorCodes.DEPOSITS_NOT_ALLOWED });
    }

    const bonusId = await pg.transaction(async (tx) => {
      if (deposit.bonusCode != null) {
        const bonus = await getBonusByCode(req.session.playerId, deposit.bonusCode, tx);
        if (bonus != null) {
          return bonus.id;
        }
        return null;
      }
      return deposit.bonusId;
    });
    const { transactionKey } = await startDeposit(req.session.playerId, selectedMethod.providerId, deposit.amount, bonusId, deposit.parameters, deposit.fee, req.session.id);

    return res.json({
      transactionKey,
    });
  } catch (e) {
    logger.debug('startDepositHandler exception', e);
    if (e.message) {
      if (e.message.includes('amount')) {
        return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_AMOUNT });
      }
      if (e.message.includes('bonusId')) {
        return res.status(400).json({ error: errorCodes.INVALID_BONUS_ID });
      }
      if (e.message.includes('bonusCode')) {
        return res.status(400).json({ error: errorCodes.INVALID_BONUS_ID });
      }
      if (e.message.includes('depositMethod')) {
        return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_ACCOUNT });
      }
    }
    const { error: result } = e;
    if (result) {
      return res.status(400).json({ error: result });
    }
    logger.warn('Deposit failed', e);
    return next(e);
  }
};

const getDepositHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const deposit = await getDeposit(req.params.transactionKey);
    if (deposit == null) {
      return res.status(404).json({ error: errorCodes.DEPOSIT_NOT_FOUND });
    }
    const balance = await getBalance(deposit.playerId);
    return res.json({ deposit, balance });
  } catch (e) {
    logger.warn('getDepositHandler failed', e);
    return next(e);
  }
};

const processDepositHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { transactionKey } = req.params;
    const deposit = await validate(req.body, processDepositSchema, 'Process deposit failed');
    const { playerId, id, accountId } = await processDeposit(
      deposit.withoutAmount ? null : deposit.amount,
      transactionKey,
      deposit.account,
      deposit.accountHolder,
      deposit.externalTransactionId,
      deposit.status,
      deposit.message,
      deposit.rawTransaction,
      deposit.accountParameters,
      null,
      null,
      deposit.paymentCost,
    );
    const balance = await getBalance(playerId);
    return res.json({
      depositId: id,
      playerId,
      balance,
      accountId,
    });
  } catch (e) {
    logger.debug('processDepositHandler exception', e);
    if (e.message) {
      if (e.message.includes('amount')) {
        return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_AMOUNT });
      } if (e.message.includes('account')) {
        return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_ACCOUNT });
      } if (e.message.includes('externalTransactionId')) {
        return res.status(400).json({ error: errorCodes.INVALID_EXTERNAL_TRANSACTION_ID });
      }
    }
    if (e.constraint === 'payments_paymentMethodId_externalTransactionId_key') {
      return res.status(400).json({ error: errorCodes.INVALID_EXTERNAL_TRANSACTION_ID });
    }
    logger.warn('processDeposit failed', e);
    return next(e);
  }
};

const updateDepositHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { transactionKey } = req.params;
    const deposit = await validate(req.body, updateDepositSchema, 'Update deposit failed');
    const { playerId, id, accountId } = await processDeposit(
      deposit.amount,
      transactionKey,
      deposit.account,
      deposit.accountHolder,
      deposit.externalTransactionId,
      deposit.status,
      deposit.message,
      deposit.rawTransaction,
      deposit.accountParameters,
      deposit.depositParameters,
      deposit.fee,
    );
    const balance = await getBalance(playerId);
    return res.json({
      depositId: id,
      playerId,
      balance,
      accountId,
    });
  } catch (e) {
    logger.debug('updateDepositHandler exception', e);
    if (e.message.includes('amount')) {
      return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_AMOUNT });
    } if (e.message.includes('account')) {
      return res.status(400).json({ error: errorCodes.INVALID_DEPOSIT_ACCOUNT });
    } if (e.message.includes('externalTransactionId')) {
      return res.status(400).json({ error: errorCodes.INVALID_EXTERNAL_TRANSACTION_ID });
    }
    if (e.constraint === 'payments_paymentMethodId_externalTransactionId_key') {
      return res.status(400).json({ error: errorCodes.INVALID_EXTERNAL_TRANSACTION_ID });
    }
    logger.warn('processDeposit failed', e);
    return next(e);
  }
};


const setDepositStatusHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { status, transactionKey } = req.params;
    const { body } = req;
    const { message, rawTransaction } = ((body): any);
    const r = { message, status, transactionKey, rawTransaction };
    const value = await validate(r, setDepositStatusSchema, 'Set deposit status failed');
    await setDepositStatus(value.transactionKey, value.status, value.message, value.rawTransaction);
    const deposit = await getRawDeposit(value.transactionKey);
    if (deposit == null) {
      return res.status(404).json({ error: errorCodes.DEPOSIT_NOT_FOUND });
    }
    const balance = await getBalance(deposit.playerId);
    return res.json({ balance, deposit, ok: true });
  } catch (err) {
    if (err.message) {
      if (err.message.includes('transactionKey')) {
        return res.status(400).json({ error: errorCodes.INVALID_TRANSACTION_KEY });
      } if (err.message.includes('status')) {
        return res.status(400).json({ error: errorCodes.INVALID_TRANSACTION_STATUS });
      }
    }
    logger.warn('setDepositStatusHandler failed', err);
    return res.status(400).json(err);
  }
};

const adjustDepositWageringRequirementHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { transactionKey } = req.params;
    const value = await validate(req.body, adjustDepositWageringSchema, 'Adjust deposit wagering requirement failed');
    await pg.transaction(async (tx) => {
      const deposit = await getDeposit(transactionKey).transacting(tx);
      if (deposit.counterId != null) {
        await adjustDepositWageringCounter(deposit.counterId, value.wageringRequirement, tx);
        await addEvent(deposit.playerId, null, 'transaction', 'adjustWagering', { transactionKey, wr: value.wageringRequirement, reason: value.reason }).transacting(tx);
      }
    });
    return res.json({ ok: true });
  } catch (err) {
    logger.warn('adjustDepositWageringRequirementHandler', err);
    return res.status(400).json(err);
  }
};

const createDepositWageringRequirementHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { transactionKey } = req.params;
    const value = await validate(req.body, adjustDepositWageringSchema, 'Adjust deposit wagering requirement failed');
    await pg.transaction(async (tx) => {
      const deposit = await getDeposit(transactionKey).transacting(tx);
      if (deposit.counterId != null) {
        await createDepositWageringCounter(deposit.playerId, value.wageringRequirement, deposit.paymentId, 'deposit_campaign', tx);
        await addEvent(deposit.playerId, null, 'transaction', 'createWagering', { transactionKey, wr: value.wageringRequirement, reason: 'Campaign deposit' }).transacting(tx);
      }
    });
    return res.json({ ok: true });
  } catch (err) {
    logger.warn('createDepositWageringRequirementHandler', err, req.params, req.body);
    return res.status(400).json(err);
  }
};


const executeDepositHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const { params, urls, transactionKey, accountId, client } = await validate(req.body, executeDepositSchema, 'Execute deposit validation failed');
    const deposit = await getDeposit(transactionKey);
    const player = await getPlayerWithDetails(Number(req.session.playerId));
    const account = accountId != null ? await getAccount(accountId) : undefined;
    const brandInfo = await getBrandInfo(brandId);
    const result = await paymentServer.deposit({ player, deposit, urls, params, account, brand: brandInfo, client });
    return res.json(result);
  } catch (err) {
    logger.warn('executeDepositHandler', err);
    return res.status(400).json(err);
  }
};

module.exports = {
  getDepositInfoHandler,
  getPnpEURDepositInfoHandler,
  startDepositHandler,
  getDepositHandler,
  processDepositHandler,
  setDepositStatusHandler,
  adjustDepositWageringRequirementHandler,
  createDepositWageringRequirementHandler,
  executeDepositHandler,
  updateDepositHandler,
};
