/* @flow */
import type {
  DepositRequest,
  WithdrawRequest,
  RegisterRequest,
  LoginRequest,
  IdentifyRequest,
} from 'gstech-core/modules/clients/paymentserver-api-types';
import type {
  BriteBasicDepositResponse,
  BriteApiWithdrawalResponse,
  BriteTransaction,
  BriteSession,
  BriteCreateKycResponse,
  BriteKyc,
  BriteAuthSessionResponse,
  BriteBankAccount,
  BriteCredentials,
} from './types';

const money = require('gstech-core/modules/money');
const { SESSION, TRANSACTION, KYC } = require('./constants');
const {
  makeTransactionCb: trxCb,
  makeSessionCb: sesCb,
  authenticateMerchant,
  authedBriteRequest,
  briteRequest,
  pollWithBackoff,
} = require('./utils');

const getSessionById = async (id: string, brandId: BrandId): Promise<BriteSession> =>
  await authedBriteRequest('session.get', brandId, { id });

const getSessionByToken = async (token: string, brandId: BrandId): Promise<BriteSession> =>
  await briteRequest('session.get_by_token', brandId, { token });

const approveSession = async (sessionToken: string, brandId: BrandId): Promise<any> =>
  await authedBriteRequest('session.approve', brandId, { sessionToken });

const rejectSession = async (sessionToken: string, brandId: BrandId, reason?: string): Promise<any> =>
  await authedBriteRequest('session.reject', brandId, { sessionToken, reason });

const getTransactionById = async (id: string, brandId: BrandId): Promise<BriteTransaction> =>
  await authedBriteRequest('transaction.get', brandId, { id });
const getTransactionFromSessionId = async (
  id: string,
  brandId: BrandId,
): Promise<BriteTransaction> => {
  const creds = await authenticateMerchant(brandId);
  const { transactionId } = await authedBriteRequest('session.get', brandId, { id }, creds);
  return await authedBriteRequest('transaction.get', brandId, { id: transactionId }, creds);
};
const getBankAccountById = async (id: string, brandId: BrandId): Promise<BriteBankAccount> =>
  await authedBriteRequest('bank_account.get', brandId, { id });
const getKycById = async (id: string, brandId: BrandId): Promise<BriteKyc> =>
  await authedBriteRequest('kyc.get', brandId, { id });
const createKyc = async (customerId: string, brandId: BrandId): Promise<BriteCreateKycResponse> =>
  await authedBriteRequest('kyc.create', brandId, { customerId });

const getLatestCustomerKyc = async (
  customerId: string,
  brandId: BrandId,
  auth: ?BriteCredentials,
): Promise<BriteKyc> => await authedBriteRequest('kyc.get_latest', brandId, { customerId }, auth);
const createAndGetKyc = async (
  customerId: string,
  brandId: BrandId,
  auth: ?BriteCredentials,
): Promise<BriteKyc> => {
  const creds = auth || (await authenticateMerchant(brandId));
  const { id } = await authedBriteRequest('kyc.create', brandId, { customerId }, creds);
  const kyc = await pollWithBackoff(
    authedBriteRequest('kyc.get', brandId, { id }, creds),
    ({ state }) => state === KYC.STATE_FAILED || state === KYC.STATE_COMPLETED,
  );
  return kyc;
};
const getOrCreateKyc = async (customerId: string, brandId: BrandId): Promise<BriteKyc> => {
  const creds = await authenticateMerchant(brandId);
  let kyc;
  try {
    kyc = await getLatestCustomerKyc(customerId, brandId, creds);
    // TODO Brite: we can 'throw' here if kyc is older than some time-frame we arbitrarily choose
  } catch (e) {
    if (e.error.error_name !== 'NotFound') throw e;
    kyc = await createAndGetKyc(customerId, brandId, creds);
  }
  if (kyc.state === KYC.STATE_FAILED) throw new Error('getOrCreateKyc KYC Failed.');
  return kyc;
};

const basicDeposit = async ({
  deposit: { amount, transactionKey },
  player,
}: DepositRequest): Promise<BriteBasicDepositResponse> =>
  await authedBriteRequest('session.create_deposit', player.brandId, {
    customer_firstname: player.firstName, // required
    customer_lastname: player.lastName, // required
    country_id: player.countryId, // required
    amount: money.asFloat(amount),
    merchant_reference: `${player.username}|${transactionKey}`,
    callbacks: [
      sesCb(SESSION.STATE_ABORTED, `/${player.brandId}/std`),
      sesCb(SESSION.STATE_FAILED, `/${player.brandId}/std`),
      trxCb(TRANSACTION.STATE_ABORTED, `/${player.brandId}/std`),
      trxCb(TRANSACTION.STATE_FAILED, `/${player.brandId}/std`),
      trxCb(TRANSACTION.STATE_DEBIT, `/${player.brandId}/std`),
      trxCb(TRANSACTION.STATE_CREDIT, `/${player.brandId}/std`),
    ],
  });

const kycDeposit = async ({
  deposit: { amount, transactionKey },
  player: { countryId, brandId },
}: RegisterRequest): Promise<BriteBasicDepositResponse> =>
  await authedBriteRequest('session.create_deposit', brandId, {
    amount: money.asFloat(amount), // required
    country_id: countryId, // required
    merchant_reference: `${brandId}|${transactionKey}`,
    approval_required: true,
    callbacks: [
      sesCb(SESSION.STATE_AUTHENTICATION_COMPLETED, `/${brandId}/pnp`),
      sesCb(SESSION.STATE_ABORTED, `/${brandId}/pnp`),
      sesCb(SESSION.STATE_FAILED, `/${brandId}/pnp`),
      trxCb(TRANSACTION.STATE_ABORTED, `/${brandId}/pnp`),
      trxCb(TRANSACTION.STATE_FAILED, `/${brandId}/pnp`),
      trxCb(TRANSACTION.STATE_DEBIT, `/${brandId}/pnp`),
      trxCb(TRANSACTION.STATE_CREDIT, `/${brandId}/pnp`),
    ],
  });

const apiWithdraw = async ({
  withdrawal: { amount, transactionKey, accountParameters },
  player: { username, brandId },
}: WithdrawRequest): Promise<BriteApiWithdrawalResponse> =>
  await authedBriteRequest('transaction.create_withdrawal', brandId, {
    amount: money.asFloat(amount), // required
    // $FlowIgnore
    bank_account_id: accountParameters.id, // required
    merchant_reference: `${username}|${transactionKey}`,
    callbacks: [
      trxCb(TRANSACTION.STATE_ABORTED, `/${brandId}/std`),
      trxCb(TRANSACTION.STATE_FAILED, `/${brandId}/std`),
      trxCb(TRANSACTION.STATE_CREDIT, `/${brandId}/std`),
    ],
  });

const authSessionForLogin = async ({
  deposit: { transactionKey },
  player: { countryId, brandId },
}: LoginRequest): Promise<BriteAuthSessionResponse> =>
  await authedBriteRequest('session.create_authentication', brandId, {
    country_id: countryId,
    merchant_reference: `${brandId}|${transactionKey}`,
    callbacks: [
      sesCb(SESSION.STATE_AUTHENTICATION_COMPLETED, `/${brandId}/pnp`),
      sesCb(SESSION.STATE_ABORTED, `/${brandId}/pnp`),
      sesCb(SESSION.STATE_FAILED, `/${brandId}/pnp`),
    ],
  });
const authSessionForIdentify = async ({
  player: { countryId, username, brandId },
}: IdentifyRequest): Promise<BriteAuthSessionResponse> =>
  await authedBriteRequest('session.create_authentication', brandId, {
    country_id: countryId,
    merchant_reference: `${username}|`,
    callbacks: [
      sesCb(SESSION.STATE_AUTHENTICATION_COMPLETED, `/${brandId}/std`),
      sesCb(SESSION.STATE_ABORTED, `/${brandId}/std`),
      sesCb(SESSION.STATE_FAILED, `/${brandId}/std`),
    ],
  });

module.exports = {
  getSessionById,
  getSessionByToken,
  getTransactionById,
  getTransactionFromSessionId,
  getBankAccountById,
  basicDeposit,
  kycDeposit,
  apiWithdraw,
  createKyc,
  getKycById,
  getLatestCustomerKyc,
  createAndGetKyc,
  getOrCreateKyc,
  approveSession,
  rejectSession,
  authSessionForLogin,
  authSessionForIdentify,
};
