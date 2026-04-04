/* @flow */
import type { PlayerWithDetails } from 'gstech-core/modules/types/player';
import type { PiqAuthorize, PiqCancel, PiqTransfer } from './types';

const { languages, countries } = require('country-data');
const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const validate = require('gstech-core/modules/validate');

const {
  errors,
  usePaymentIQId,
  regularDepositMethods,
  voucherDepositMethods,
  depositMethods,
  withdrawalMethods,
} = require('./constants');
const { verifyuserSchema, authorizeSchema, transferSchema, cancelSchema } = require('./schemas');

const returnError = (userId: string, { errCode, errMsg }: { errCode: string, errMsg: string }) => ({
  success: false,
  userId,
  errCode,
  errMsg,
});

const mapCountry = (countryId: string) => countries[countryId]?.alpha3 ?? 'XX';

const mapLocale = (countryId: string, languageId: string) => {
  const [country, language] = [countries[countryId], languages[languageId]];
  if (country && language && country.languages.includes(language.alpha3))
    return `${language.alpha2}_${countryId}`;
  return 'en_US';
};

const mapPlayer = (player: PlayerWithDetails, balance: number) => ({
  userId: player.username,
  firstName: player.firstName,
  lastName: player.lastName,
  street: player.address.trim(),
  city: player.city,
  zip: player.postCode,
  country: mapCountry(player.countryId),
  email: player.email,
  mobile: player.mobilePhone,
  dob: player.dateOfBirth,
  balance: money.asFloat(balance),
  balanceCy: player.currencyId,
  locale: mapLocale(player.countryId, player.languageId),
});

const mapTransactionId = ({ provider, txRefId, pspRefId }: PiqTransfer) =>
  usePaymentIQId.includes(provider) ? txRefId : pspRefId;

const verifyuserHandler = async (
  { body }: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> PIQ verifyuserHandler', { body });
    const verifyuser = await validate(body, verifyuserSchema, 'Verifyuser invalid parameters');
    let balance = 0;
    if (verifyuser.sessionId.startsWith('wd:')) {
      const wd = await client.getWithdrawal(verifyuser.userId, verifyuser.sessionId.substring(3));
      if (wd == null) {
        logger.error('XXX PIQ verifyuserHandler INVALID_USERID', { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
      }
      const { withdrawal } = wd;
      if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
        logger.error('XXX PIQ verifyuserHandler SESSION_NOT_ACTIVE', { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
      balance = withdrawal.amount;
    } else if (verifyuser.sessionId.startsWith('dp:')) {
      const dp = await client.getDeposit(verifyuser.userId, verifyuser.sessionId.substring(3));
      logger.info('+++ PIQ verifyuserHandler', { dp });
      if (dp == null) {
        logger.error(`XXX PIQ verifyuserHandler INVALID_USERID`, { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
      }
      const { deposit } = dp;
      if (['expired', 'cancelled', 'failed'].includes(deposit.status)) {
        logger.error(`XXX PIQ verifyuserHandler SESSION_NOT_ACTIVE`, { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
      balance = deposit.amount;
    } else {
      logger.warn(`!!! PIQ verifyuserHandler MISSING 'wd:'/'dp:' prefix`, { verifyuser });
      try {
        const session = await client.session(verifyuser.userId, verifyuser.sessionId);
        if (session.username !== verifyuser.userId) {
          logger.error(`XXX PIQ verifyuserHandler INVALID_USERID`, { verifyuser });
          return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
        }
      } catch (e) {
        logger.error('XXX PIQ verifyuserHandler SESSION_NOT_ACTIVE', { verifyuser, error: e });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
    }

    const player = await client.details(verifyuser.userId);
    const response = { success: true, ...mapPlayer(player, balance) };

    logger.debug('<<< PIQ verifyuserHandler', { response });
    return res.status(200).json(response);
  } catch (err) {
    logger.error('XXX PIQ verifyuserHandler', { err });
    return next(err);
  }
};

const processAuthorizeDeposit = async (authorize: PiqAuthorize) => {
  const { txAmountCy, attributes, userId } = authorize;
  const { deposit, balance } = await client.getDeposit(userId, attributes.transactionKey);
  if (balance.currencyId !== txAmountCy) return returnError(userId, errors.INVALID_CURRENCY);
  if (deposit.status !== 'created') return returnError(userId, errors.DEPOSIT_NOT_ACTIVE);
  return { userId: authorize.userId, success: true, authCode: deposit.transactionKey };
};

const processAuthorizeWithdrawal = async (authorize: PiqAuthorize) => {
  const { attributes, userId } = authorize;
  const wd = await client.getWithdrawal(userId, attributes.transactionKey);
  if (wd == null) return returnError(userId, errors.INVALID_USERID);
  const { withdrawal } = wd;
  if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
    logger.warn('!!! PIQ processAuthorizeWithdrawal::Invalid session', { authorize });
    return returnError(userId, errors.SESSION_NOT_ACTIVE);
  }
  return { userId, success: true, authCode: withdrawal.transactionKey };
};

const authorizeHandler = async (
  { body }: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  logger.debug('>>> PIQ authorizeHandler', { body });
  try {
    const authorize = await validate(body, authorizeSchema, 'Authorize request failed');
    const { txName, userId } = authorize;

    if (depositMethods.includes(txName)) {
      const ret = await processAuthorizeDeposit(authorize);
      logger.debug(`<<< PIQ authorizeHandler::processAuthorizeDeposit ${txName}`, { ret });
      return res.status(200).json(ret);
    }

    if (withdrawalMethods.includes(txName)) {
      const ret = await processAuthorizeWithdrawal(authorize);
      logger.debug(`<<< PIQ authorizeHandler::processAuthorizeWithdrawal ${txName}`, { ret });
      return res.status(200).json(ret);
    }

    const ret = returnError(userId, errors.UNSUPPORTED_METHOD)
    logger.warn('!!! PIQ authorizeHandler', { ret, authorize });
    return res.status(200).json(ret);
  } catch (err) {
    logger.error('XXX PIQ authorizeHandler', { err });
    return next(err);
  }
};

const processDepositTransfer = async (transfer: PiqTransfer) => {
  const { balance, deposit: dp } = await client.getDeposit(
    transfer.userId,
    transfer.attributes.transactionKey,
  );

  const message = `(PaymentIQ: ${transfer.txId}) ${transfer.pspStatusMessage}`;
  const withoutAmount = transfer.txAmountCy !== balance.currencyId;
  const deposit = {
    account: transfer.maskedAccount || undefined,
    accountHolder: transfer.accountHolder,
    externalTransactionId: mapTransactionId(transfer),
    accountParameters: {
      paymentIqAccountId: transfer.accountId,
      provider: transfer.provider,
      pspService: transfer.pspService,
      expiryMonth: transfer.expiryMonth,
      expiryYear: transfer.expiryYear,
      ...(transfer.attributes.nationalId?.length
        ? { nationalId: transfer.attributes.nationalId }
        : {}),
    },
    message,
    rawTransaction: transfer,
    ...(withoutAmount ? { withoutAmount: true } : { amount: transfer.txAmount }),
  };

  const result = await client.processDeposit(transfer.userId, transfer.authCode, deposit);
  if (transfer.attributes.nationalId?.length)
    await client.updatePlayerDetails(balance.brandId, dp.playerId, {
      nationalId: transfer.attributes.nationalId,
    });

  return {
    userId: transfer.userId,
    success: true,
    txId: transfer.txId,
    merchantTxId: `${result.depositId}`,
  };
};

const processVoucherDepositTransfer = async (transfer: PiqTransfer) => {
  const message = `(PSP ID: ${transfer.pspRefId}) ${transfer.pspStatusMessage} ${
    transfer.maskedAccount || ''
  }`;
  const deposit = {
    amount: transfer.txAmount,
    account: transfer.maskedAccount || '',
    accountHolder: null,
    externalTransactionId: transfer.txRefId,
    accountParameters: {
      paymentIqAccountId: transfer.accountId,
      provider: transfer.provider,
      pspService: transfer.pspService,
    },
    message,
    rawTransaction: transfer,
  };
  const result = await client.processDeposit(transfer.userId, transfer.authCode, deposit);
  return {
    userId: transfer.userId,
    success: true,
    txId: transfer.txId || transfer.pspRefId,
    merchantTxId: `${result.depositId}`,
  };
};

const processWithdrawalTransfer = async (transfer: PiqTransfer) => {
  const complete = {
    externalTransactionId: transfer.txId,
    message: transfer.pspStatusMessage || 'OK',
    rawTransaction: transfer,
  };
  const result = await client.setWithdrawalStatus(
    transfer.userId,
    transfer.authCode,
    'complete',
    complete,
  );
  return {
    userId: transfer.userId,
    success: result.complete,
    txId: transfer.txId,
    merchantTxId: `${result.paymentId || transfer.attributes.transactionKey}`,
  };
};

const transferHandler = async (
  { body }: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  logger.debug('>>> PIQ transferHandler', { body });
  try {
    const transfer = await validate(body, transferSchema, 'Transfer request failed');
    const logPrefix = `<<< PIQ transferHandler::`;

    if (regularDepositMethods.includes(transfer.txName)) {
      const ret = await processDepositTransfer(transfer);
      logger.debug(`${logPrefix}processDepositTransfer ${transfer.txName}`, { ret });
      return res.status(200).json(ret);
    }

    if (voucherDepositMethods.includes(transfer.txName)) {
      const ret = await processVoucherDepositTransfer(transfer);
      logger.debug(`${logPrefix}processDepositTransfer ${transfer.txName}`, { ret });
      return res.status(200).json(ret);
    }

    if (withdrawalMethods.includes(transfer.txName)) {
      const ret = await processWithdrawalTransfer(transfer);
      logger.debug(`${logPrefix}processWithdrawalTransfer ${transfer.txName}`, { ret });
      return res.status(200).json(ret);
    }

    const ret = returnError(transfer.userId, errors.UNSUPPORTED_METHOD)
    logger.warn('!!! PIQ transferHandler', { ret, transfer });
    return res.status(200).json(ret);
  } catch (err) {
    logger.error('XXX PIQ transferHandler', { err });
    return next(err);
  }
};

const processCancelWithdrawal = async (cancel: PiqCancel) => {
  const wd = await client.getWithdrawal(cancel.userId, cancel.attributes.transactionKey);
  if (wd == null || wd.withdrawal == null)
    return returnError(cancel.userId, errors.WITHDRAWAL_NOT_ACTIVE);
  const { withdrawal } = wd;
  if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
    logger.error('XXX PIQ processCancelWithdrawal SESSION_NOT_ACTIVE', { cancel });
    return returnError(cancel.userId, errors.SESSION_NOT_ACTIVE);
  }
  const fail = {
    externalTransactionId: cancel.txId,
    message: cancel.pspStatusMessage || cancel.pspStatusCode || '',
    rawTransaction: cancel,
  };
  await client.setWithdrawalStatus(cancel.userId, cancel.authCode, 'failed', fail);
  return { userId: cancel.userId, success: true };
};

const processCancelDeposit = async (cancel: PiqCancel) => {
  const fail = {
    message: cancel.pspStatusMessage || 'No message',
    rawTransaction: cancel,
  };
  await client.setDepositStatus(cancel.userId, cancel.authCode, 'failed', fail);
  logger.info('+++ PIQ processCancelDeposit Deposit Cancelled', { cancel });
  return { userId: cancel.userId, success: true };
};

const cancelHandler = async (
  { body }: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  logger.debug('>>> PIQ cancelHandler', { body });
  try {
    const cancel = await validate(body, cancelSchema, 'Cancel request failed');
    if (depositMethods.includes(cancel.txName)) {
      const ret = await processCancelDeposit(cancel);
      logger.debug(`<<< PIQ cancelHandler::processCancelDeposit ${cancel.txName}`, { ret });
      return res.status(200).json(ret);
    }
    if (withdrawalMethods.includes(cancel.txName)) {
      const ret = await processCancelWithdrawal(cancel);
      logger.debug(`<<< PIQ cancelHandler::processCancelWithdrawal ${cancel.txName}`, { ret });
      return res.status(200).json(ret);
    }

    const ret = returnError(cancel.userId, errors.UNSUPPORTED_METHOD);
    logger.warn('!!! PIQ cancelHandler', { ret, cancel });
    return res.status(200).json(ret);
  } catch (err) {
    logger.error('XXX PIQ cancelHandler', { err });
    return next(err);
  }
};

module.exports = { authorizeHandler, verifyuserHandler, transferHandler, cancelHandler };
