/* @flow */
const { languages, countries } = require('country-data');
const includes = require('lodash/includes');

const client = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const money = require('gstech-core/modules/money');
const validate = require('gstech-core/modules/validate');

const schemas = require('./schemas');

const depositMethods = ['CreditcardDeposit', 'VisaVoucherDeposit', 'GiftcardDeposit', 'BankDeposit'];
const withdrawalMethods = ['CreditcardWithdrawal', 'BankWithdrawal', 'BankIBANWithdrawal', 'InteracWithdrawal', 'AstroPayBankWithdrawal'];
const usePaymentIQId = ['Interac', 'BamboraGa']; // Use PaymentIQ id on our side for these transactions. Otherwise use payment providers native id.
/*
  <response>100</response>
  <statusCode>ERR_DECLINED_NO_FUNDS</statusCode>
  <response>110</response>
  <statusCode>ERR_DECLINED_BAD_REQUEST</statusCode>
  <response>200</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>201</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>202</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>203</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>204</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>205</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>250</response>
  <statusCode>ERR_DECLINED_LIMIT_OVERDRAWN</statusCode>
  <response>300</response>
  <statusCode>ERR_NOT_AUTHENTICATED</statusCode>
  <response>400</response>
  <statusCode>ERR_DECLINED_BAD_REQUEST</statusCode>
  <response>500</response>
  <statusCode>ERR_MERCHANT_OUT_OF_SERVICE</statusCode>
*/
const errors = {
  SESSION_NOT_ACTIVE: { errCode: '110', errMsg: 'Session not active' },
  INVALID_USERID: { errCode: '400', errMsg: 'Invalid userId' },
  INVALID_CURRENCY: { errCode: '400', errMsg: 'Invalid currency' },
  DEPOSIT_NOT_ACTIVE: { errCode: '300', errMsg: 'Deposit not active' },
  UNSUPPORTED_METHOD: { errCode: '500', errMsg: 'Payment method not currently active' },
  WITHDRAWAL_NOT_ACTIVE: { errCode: '400', errMsg: 'Withdrawal not active' },
};

const returnError = (userId: string, err: { errCode: string, errMsg: string }) => ({
  userId,
  success: false,
  errCode: err.errCode,
  errMsg: err.errMsg,
});

const mapCountry = (countryId: string) => {
  const country = countries[countryId];
  if (country != null) {
    return country.alpha3;
  }
  return 'XX';
};

const mapLocale = (countryId: string, languageId: string) => {
  const country = countries[countryId];
  if (country != null) {
    const lang = languages[languageId];
    if (lang && country.languages.includes(lang.alpha3)) {
      return `${lang.alpha2}_${countryId}`;
    }
  }
  return 'en_US';
};

const verifyuserHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const verifyuser = await validate(req.body, schemas.verifyuserSchema, 'Verifyuser invalid parameters');
    let balance = 0;
    if (verifyuser.sessionId.indexOf('wd:') === 0) {
      const wd = await client.getWithdrawal(verifyuser.userId, verifyuser.sessionId.substring(3));
      if (wd == null) {
        return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
      }
      const { withdrawal } = wd;
      if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
        logger.warn('Invalid session', { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
      balance = withdrawal.amount;
    } else if (verifyuser.sessionId.indexOf('dp:') === 0) {
      const dp = await client.getDeposit(verifyuser.userId, verifyuser.sessionId.substring(3));
      if (dp == null) {
        return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
      }
      const { deposit } = dp;
      if (deposit.status !== 'created') {
        logger.warn('Invalid session', { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
      balance = deposit.amount;
    } else {
      try {
        const session = await client.session(verifyuser.userId, verifyuser.sessionId);
        if (session.username !== verifyuser.userId) {
          return res.status(200).json(returnError(verifyuser.userId, errors.INVALID_USERID));
        }
      } catch (e) {
        logger.warn('Invalid session', { verifyuser });
        return res.status(200).json(returnError(verifyuser.userId, errors.SESSION_NOT_ACTIVE));
      }
    }

    const player = await client.details(verifyuser.userId);

    const { username, firstName, lastName, address, city, postCode, countryId, email, mobilePhone, dateOfBirth, currencyId, languageId } = player;

    return res.status(200).json({
      userId: username,
      success: true,
      firstName,
      lastName,
      street: address.trim(),
      city,
      zip: postCode,
      country: mapCountry(countryId),
      email,
      mobile: mobilePhone,
      dob: dateOfBirth,
      balance: money.asFloat(balance),
      balanceCy: currencyId,
      locale: mapLocale(countryId, languageId),
    });
  } catch (err) {
    logger.warn('authorize action failed', err);
    return next(err);
  }
};

type Authorize = {
  txAmountCy: string,
  attributes: { transactionKey: string, ... },
  userId: string,
};

const processAuthorizeDeposit = async (authorize: Authorize) => {
  const { txAmountCy, attributes, userId } = authorize;

  const { deposit, balance } = await client.getDeposit(userId, attributes.transactionKey);

  if (balance.currencyId !== txAmountCy) {
    return returnError(userId, errors.INVALID_CURRENCY);
  }
  if (deposit.status !== 'created') {
    return returnError(userId, errors.DEPOSIT_NOT_ACTIVE);
  }
  return {
    userId: authorize.userId,
    success: true,
    authCode: deposit.transactionKey,
  };
};

const processAuthorizeWithdrawal = async (authorize: Authorize) => {
  const { attributes, userId } = authorize;

  const wd = await client.getWithdrawal(userId, attributes.transactionKey);
  if (wd == null) {
    return returnError(userId, errors.INVALID_USERID);
  }
  const { withdrawal } = wd;

  if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
    logger.warn('Invalid session', { authorize });
    return returnError(userId, errors.SESSION_NOT_ACTIVE);
  }

  return {
    userId,
    success: true,
    authCode: withdrawal.transactionKey,
  };
};

const authorizeHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const authorize = await validate(req.body, schemas.authorizeSchema, 'Authorize request failed');
    const { txName, userId } = authorize;

    if (includes(depositMethods, txName)) {
      const ret = await processAuthorizeDeposit(authorize);
      return res.status(200).json(ret);
    }

    if (includes(withdrawalMethods, txName)) {
      const ret = await processAuthorizeWithdrawal(authorize);
      return res.status(200).json(ret);
    }

    logger.warn('paymentIQ authorizeHandler', authorize);
    return res.status(200).json(returnError(userId, errors.UNSUPPORTED_METHOD));
  } catch (err) {
    logger.warn('authorize action failed', err);
    return next(err);
  }
};

type Transfer = {
  txAmountCy: string,
  txAmount: number,
  authCode: string,
  attributes: { transactionKey: string, nationalId: string, ... },
  userId: string,
  pspStatusMessage: string,
  maskedAccount: string,
  accountHolder: string,
  txRefId: string,
  pspRefId: string,
  accountId: string,
  provider: string,
  pspService: string,
  txId: string,
  expiryMonth: string,
  expiryYear: string,
}

const processDepositTransfer = async (transfer: Transfer) => {
  const { balance , deposit: { playerId } } = await client.getDeposit(transfer.userId, transfer.attributes.transactionKey);

  const message = `(PaymentIQ: ${transfer.txId}) ${transfer.pspStatusMessage}`;
  const withoutAmount = transfer.txAmountCy !== balance.currencyId;
  const transactionId = includes(usePaymentIQId, transfer.provider) ? transfer.txRefId : transfer.pspRefId;
  let deposit = {
    account: transfer.maskedAccount || undefined,
    accountHolder: transfer.accountHolder,
    externalTransactionId: transactionId,
    accountParameters: {
      paymentIqAccountId: transfer.accountId,
      provider: transfer.provider,
      pspService: transfer.pspService,
      nationalId: transfer.attributes.nationalId,
      expiryMonth: transfer.expiryMonth,
      expiryYear: transfer.expiryYear,
    },
    message,
    rawTransaction: transfer,
  };

  if (withoutAmount) {
    deposit = ({ ...deposit, withoutAmount: true });
  } else {
    deposit = ({ ...deposit, amount: transfer.txAmount });
  }

  const result = await client.processDeposit(transfer.userId, transfer.authCode, deposit);
  if (transfer.attributes.nationalId)
    await client.updatePlayerDetails(balance.brandId, playerId, { nationalId: transfer.attributes.nationalId });

  const ret = {
    userId: transfer.userId,
    success: true,
    txId: transfer.txId,
    merchantTxId: `${result.depositId}`,
  };
  return ret;
};

const processVoucherDepositTransfer = async (transfer: Transfer) => {
  const message = `(PSP ID: ${transfer.pspRefId}) ${transfer.pspStatusMessage} ${transfer.maskedAccount || ''}`;
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
  const ret = {
    userId: transfer.userId,
    success: true,
    txId: transfer.txId || transfer.pspRefId,
    merchantTxId: `${result.depositId}`,
  };
  return ret;
};

const processWithdrawalTransfer = async (transfer: Transfer) => {
  const complete = {
    externalTransactionId: transfer.txId,
    message: transfer.pspStatusMessage || 'OK',
    rawTransaction: transfer,
  };
  const result = await client.setWithdrawalStatus(transfer.userId, transfer.authCode, 'complete', complete);
  const ret = {
    userId: transfer.userId,
    success: result.complete,
    txId: transfer.txId,
    merchantTxId: `${result.paymentId || transfer.attributes.transactionKey}`,
  };
  return ret;
};

const transferHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const transfer = await validate(req.body, schemas.transferSchema, 'Transfer request failed');
    logger.debug('Process transfer', transfer);

    if (includes(['CreditcardDeposit', 'BankDeposit'], transfer.txName)) {
      const ret = await processDepositTransfer(transfer);
      logger.debug('Process deposit, return', ret);
      return res.status(200).json(ret);
    }

    if (includes(['VisaVoucherDeposit', 'GiftcardDeposit'], transfer.txName)) {
      const ret = await processVoucherDepositTransfer(transfer);
      logger.debug('Process deposit, return', ret);
      return res.status(200).json(ret);
    }

    if (includes(withdrawalMethods, transfer.txName)) {
      const ret = await processWithdrawalTransfer(transfer);
      logger.debug('Process withdrawal, return', ret);
      return res.status(200).json(ret);
    }
    logger.warn('paymentIQ transferHandler', transfer);
    return res.status(200).json(returnError(transfer.userId, errors.UNSUPPORTED_METHOD));
  } catch (err) {
    logger.warn('transfer action failed', err);
    return next(err);
  }
};

type Cancel = {
  userId: string,
  authCode: string,
  attributes: { transactionKey: string, ... },
  pspStatusMessage: string,
  txId: string,
  pspStatusCode: string,
}

const processCancelWithdrawal = async (cancel: Cancel) => {
  const wd = await client.getWithdrawal(cancel.userId, cancel.attributes.transactionKey);
  if (wd == null || wd.withdrawal == null) {
    return returnError(cancel.userId, errors.WITHDRAWAL_NOT_ACTIVE);
  }
  const { withdrawal } = wd;
  if (withdrawal.status !== 'accepted' && withdrawal.status !== 'processing') {
    logger.warn('Invalid session', { cancel });
    return returnError(cancel.userId, errors.SESSION_NOT_ACTIVE);
  }
  const fail = {
    externalTransactionId: cancel.txId,
    message: cancel.pspStatusMessage || cancel.pspStatusCode || '',
    rawTransaction: cancel,
  };
  await client.setWithdrawalStatus(cancel.userId, cancel.authCode, 'failed', fail);
  return {
    userId: cancel.userId,
    success: true,
  };
};

const processCancelDeposit = async (cancel: Cancel) => {
  const fail = {
    message: cancel.pspStatusMessage || 'No message',
    rawTransaction: cancel,
  };
  await client.setDepositStatus(cancel.userId, cancel.authCode, 'failed', fail);
  logger.debug('Cancel deposit!', cancel);
  return {
    userId: cancel.userId,
    success: true,
  };
};

const cancelHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const cancel = await validate(req.body, schemas.cancelSchema, 'Cancel request failed');
    if (includes(depositMethods, cancel.txName)) {
      const ret = await processCancelDeposit(cancel);
      return res.status(200).json(ret);
    }
    if (includes(withdrawalMethods, cancel.txName)) {
      const ret = await processCancelWithdrawal(cancel);
      return res.status(200).json(ret);
    }

    logger.warn('paymentIQ cancelHandler', cancel);
    return res.status(200).json(returnError(cancel.userId, errors.UNSUPPORTED_METHOD));
  } catch (err) {
    logger.warn('Cancel action failed', err);
    return next(err);
  }
};


module.exports = { authorizeHandler, verifyuserHandler, transferHandler, cancelHandler };
