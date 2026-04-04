/* @flow */
import type {
  DepositStatusResponse,
  WithdrawalStatusResponse,
  CreateDocumentResponse,
  TemporaryPlayerResponse,
  DepositResponse,
  FailPartialLoginResponse
} from 'gstech-core/modules/clients/backend-payment-api';
import type { BriteTransaction, BriteSession, BriteCallbackBody } from './types';

const backend = require('gstech-core/modules/clients/backend-payment-api');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const { parseMoney } = require('gstech-core/modules/money');

const { SESSION, TRANSACTION } = require('./constants');
const { briteCallbackSchema } = require('./schemas');
const { parseMerchantReference, stringifySessionState } = require('./utils');
const {
  getTransactionById,
  getBankAccountById,
  getSessionById,
  getOrCreateKyc,
  approveSession,
  rejectSession
} = require('./Brite');

function isTransaction(st: BriteTransaction | BriteSession): boolean %checks {
  return (
    (st.type === TRANSACTION.TYPE_DEPOSIT && !!st.sessionId) || // API WDs have no sessionId
    (st.type === TRANSACTION.TYPE_WITHDRAWAL && !!(st.toBankAccountId || st.fromBankAccountId))
  );
}

function isSession(st: BriteTransaction | BriteSession): boolean %checks {
  return !st.sessionId && !st.toBankAccountId && !st.fromBankAccountId;
}

/** Note on PNP Flow
 * For PNP register, credit() depends on corresponding kyc() to have called backend.registerPartialPlayer()
 * this creates the deposit for the PNP register, which credit() needs when calling backend.processDepositAlt()
 * In kyc(), we can do our own validation, then call session.approve or reject...
 * but for this, access to the sessionToken is required, has to be retrieved from some external storage.
 */

const kyc = async (s: BriteSession): Promise<TemporaryPlayerResponse | OkResult> => {
  const { brandId, transactionKey } = await parseMerchantReference(s.merchantReference, {
    pnpRegistration: true,
  });
  const { status, parameters } = await backend.getPartialLogin(brandId, transactionKey);
  if (status === 'failed') return { ok: false };
  if (status !== 'started')
    throw new Error(`Brite::kyc [${transactionKey}] expected status='started' got '${status}'`);
  const isPnpDeposit = s.type === SESSION.TYPE_DEPOSIT;
  if (isPnpDeposit && !parameters?.sessionToken)
    throw new Error(`Brite::kyc [${transactionKey}] got params '${JSON.stringify(parameters)}'`);
  try {
    const kycInfo = await getOrCreateKyc(s.customerId, brandId);
    const checkRegistration = await backend.registerPartialPlayer(brandId, {
      transactionKey,
      player: {
        firstName: kycInfo.firstname,
        lastName: kycInfo.lastname,
        dateOfBirth: kycInfo.dob,
        countryId: kycInfo.countryId.toUpperCase(),
        nationalId: kycInfo.ssn,
        address: kycInfo.address.streetAddress,
        postCode: kycInfo.address.postalCode,
        city: kycInfo.address.city,
      },
    });
    if (isPnpDeposit) await approveSession(parameters.sessionToken, brandId);
    return checkRegistration;
  } catch (e) {
    if (isPnpDeposit) await rejectSession(parameters.sessionToken, brandId, e.message);
    await backend.failPartialLogin(brandId, transactionKey, e);
    if (e.message && e.message.startsWith('getOrCreateKyc')) throw new Error(`Brite::kyc::${e.message}`);
    throw e;
  }
};

const account = async (st: BriteSession | BriteTransaction): Promise<CreateDocumentResponse> => {
  try {
    const { brandId, username } = await parseMerchantReference(st.merchantReference);
    const kycInfo = await getOrCreateKyc(st.customerId, brandId);
    const documentContent = `\
    Identification from Brite:
    \n\t- SSN: ${kycInfo.ssn}
    \n\t- Date of Birth: ${kycInfo.dob}
    \n\t- Name: ${kycInfo.firstname} ${kycInfo.lastname}
    \n\t- Address: ${kycInfo.address.streetAddress}
    \n\t- Postcode: ${kycInfo.address.postalCode}
    \n\t- City: ${kycInfo.address.city}`;
    return await backend.addDocument(username, {
      type: 'identification',
      content: documentContent,
      source: 'Brite',
      fields: kycInfo,
    });
  } catch (e) {
    if (e.message.startsWith('getOrCreateKyc')) throw new Error(`Brite::account::${e.message}`);
    throw e;
  }
};

const fail = async (
  st: BriteTransaction | BriteSession,
): Promise<DepositStatusResponse | WithdrawalStatusResponse | FailPartialLoginResponse> => {
  const { brandId, username, transactionKey, isPnp } = await parseMerchantReference(
    st.merchantReference,
  );
  if (isSession(st) && isPnp && (username || st.transactionId))
    return await backend.failPartialLogin(brandId, transactionKey, {
      message: st.errorCode || 'Session failed for unknown reason or was manually failed by Brite.',
    });
  if (
    (isTransaction(st) && st.type === TRANSACTION.TYPE_DEPOSIT) ||
    (isSession(st) && !st.transactionId) // dep aborted before tx created | pnp auth aborted before kyc
  ) {
    if (username) // regular deposit | kyc-verified pnp deposit
      return await backend.setDepositStatusAlt(transactionKey, 'failed', {
        message: 'Deposit Failed',
        rawTransaction: st,
      });
    return await backend.failPartialLogin(brandId, transactionKey, {
      message: st.errorCode || 'Session failed for unknown reason or was manually failed by Brite.',
    });
  }
  if (isTransaction(st) && st.type === TRANSACTION.TYPE_WITHDRAWAL)
    return await backend.setWithdrawalStatus(username, transactionKey, 'failed', {
      externalTransactionId: st.id,
      message: 'Withdrawal failed',
      rawTransaction: st,
    });
  logger.error(`Brite::fail expected t.type={0,1} got '${st.type}'`, { st });
  throw new Error(`Brite::fail expected t.type={0,1} got '${st.type}'`);
};

const cancel = async (
  st: BriteTransaction | BriteSession,
): Promise<DepositStatusResponse | WithdrawalStatusResponse | FailPartialLoginResponse> => {
  const { brandId, username, transactionKey, isPnp } = await parseMerchantReference(
    st.merchantReference,
  );
  if (isSession(st) && isPnp && (username || st.transactionId))
    return await backend.failPartialLogin(brandId, transactionKey, {
      message: st.errorCode,
    });
  if (
    (isTransaction(st) && st.type === TRANSACTION.TYPE_DEPOSIT) ||
    (isSession(st) && !st.transactionId) // dep aborted before tx created | pnp auth aborted before kyc
  ) {
    if (username) // regular deposit | kyc-verified pnp deposit
      return await backend.setDepositStatusAlt(transactionKey, 'cancelled', {
        message: `Deposit Aborted | ${st.errorCode}`,
        rawTransaction: st,
      });
    return await backend.failPartialLogin(brandId, transactionKey, {
      message: st.errorCode,
    });
  }
  if (isTransaction(st) && st.type === TRANSACTION.TYPE_WITHDRAWAL)
    return await backend.setWithdrawalStatus(username, transactionKey, 'failed', {
      externalTransactionId: st.id,
      message: `Withdrawal Aborted | ${st.errorCode}`,
      rawTransaction: st,
    });
  logger.error(`Brite::cancel expected t.type={0,1} got '${st.type}'`, { st });
  throw new Error(`Brite::cancel expected t.type={0,1} got '${st.type}'`);
};

const credit = async (t: BriteTransaction): Promise<DepositResponse | WithdrawalStatusResponse> => {
  const { brandId, username, transactionKey } = await parseMerchantReference(t.merchantReference);
  if (t.type === TRANSACTION.TYPE_DEPOSIT) {
    const {
      customerId,
      fromBankAccount: { countryId: bankCountry, bankName, iban },
    } = t;
    const { holder, name } = await getBankAccountById(t.fromBankAccountId, brandId);
    return await backend.processDepositAlt(transactionKey, {
      account: iban,
      accountHolder: holder,
      accountParameters: {
        id: t.fromBankAccountId,
        bankName,
        bankCountry,
        name,
        holder,
        customerId,
      },
      amount: parseMoney(t.amount),
      externalTransactionId: t.id,
      message: t.message,
      status: t.state === TRANSACTION.STATE_CREDIT ? 'complete' : 'settled',
      rawTransaction: t,
    });
  }
  if (t.type === TRANSACTION.TYPE_WITHDRAWAL)
    return await backend.setWithdrawalStatus(username, transactionKey, 'complete', {
      externalTransactionId: t.id,
      message: 'Withdrawal successful',
      rawTransaction: t,
    });
  throw new Error(`Brite::credit expected t.type={0,1} got '${t.type}'`);
};

const pnpHandler = async (brandId: BrandId, cb: BriteCallbackBody) => {
  const { sessionId, transactionId } = validate(cb, briteCallbackSchema, 'Brite::pnpHandler');
  if (sessionId) {
    const s = await getSessionById(sessionId, brandId);
    switch (s.state) {
      case SESSION.STATE_AUTHENTICATION_COMPLETED:
      case SESSION.STATE_COMPLETED:
      case SESSION.STATE_BANK_ACCOUNT_SELECTION_STARTED:
      case SESSION.STATE_BANK_ACCOUNT_SELECTION_COMPLETED:
        return await kyc(s); // register|login
      case SESSION.STATE_ABORTED:
      case SESSION.STATE_FAILED:
        await (s.state === SESSION.STATE_ABORTED ? cancel(s) : fail(s))
        return { ok: false, mode: 'pnp', reason: stringifySessionState(s.state) };
      default:
        throw new Error(`Brite::pnpHandler expected s.state={2,10,11,12} got '${s.state}'`);
    }
  }
  const t = await getTransactionById(transactionId, brandId);
  switch (t.state) {
    case TRANSACTION.STATE_CREDIT:
    case TRANSACTION.STATE_COMPLETED:
    case TRANSACTION.STATE_SETTLED:
      return { ...(await credit(t)), ...(await account(t)) };
    case TRANSACTION.STATE_ABORTED:
      return await cancel(t);
    case TRANSACTION.STATE_DEBIT:
    case TRANSACTION.STATE_FAILED:
      return await fail(t);
    default:
      throw new Error(`Brite::pnpHandler expected t.state={2,3,4,5,6,7} got '${t.state}'`);
  }
};

const stdHandler = async (brandId: BrandId, cb: BriteCallbackBody) => {
  const { sessionId, transactionId } = validate(cb, briteCallbackSchema, 'Brite::stdHandler');
  if (sessionId) {
    const s = await getSessionById(sessionId, brandId);
    switch (s.state) {
      case SESSION.STATE_AUTHENTICATION_COMPLETED:
      case SESSION.STATE_COMPLETED:
        return await account(s); // identify
      case SESSION.STATE_ABORTED:
      case SESSION.STATE_FAILED:
        if (s.type === SESSION.TYPE_DEPOSIT && !s.transactionId)
          await (s.state === SESSION.STATE_ABORTED ? cancel(s) : fail(s))
        return { ok: false, mode: 'std', reason: stringifySessionState(s.state) };
      default:
        throw new Error(`Brite::stdHandler expected s.state={2,10,11,12} got '${s.state}'`);
    }
  }
  const t = await getTransactionById(transactionId, brandId);
  switch (t.state) {
    case TRANSACTION.STATE_CREDIT:
    case TRANSACTION.STATE_COMPLETED:
    case TRANSACTION.STATE_SETTLED:
      return await credit(t);
    case TRANSACTION.STATE_ABORTED:
      return await cancel(t);
    case TRANSACTION.STATE_DEBIT:
    case TRANSACTION.STATE_FAILED:
      return await fail(t);
    default:
      throw new Error(`Brite::stdHandler expected t.state={2,3,4,5,6,7} got '${t.state}'`);
  }
};

const processHandler = async (
  { body, params: { brandId, mode } }: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    // $FlowFixMe[invalid-computed-prop]
    const result = await { pnp: pnpHandler, std: stdHandler }[mode](brandId, body);
    if (result) return res.status(200).json(result);
    throw new Error(`Brite::processHandler expected mode={std,pnp} got '${mode}'`);
  } catch (e) {
    logger.error(e);
    return res.status(500).json({ error: { message: e.message } });
  }
};

module.exports = { processHandler };
