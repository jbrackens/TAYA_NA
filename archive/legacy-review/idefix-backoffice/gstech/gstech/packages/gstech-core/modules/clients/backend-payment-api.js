/* @flow */
import type {
  Balance,
  WithdrawalStatus,
  DepositStatus,
  Deposit,
  Withdrawal,
  PartialLogin,
  PartialLoginWithParameters,
  ConversionRate,
  PaymentType,
  PaymentStatus
} from '../types/backend';
import type { PaymentProvider } from "../constants";
import type { PlayerUpdateDetailsDraft } from './backend-api-types'
import type { Player, PlayerWithDetails } from '../types/player';

export type StartDepositRequest = {
  depositMethod: string,
  amount: Money,
  bonusId: ?number,
  bonusCode: ?string,
  parameters: ?mixed,
  fee: ?Money,
};

export type UpdateDepositRequest = {
  amount?: Money,
  account?: string,
  accountHolder?: ?string,
  externalTransactionId?: string,
  accountParameters?: mixed,
  depositParameters?: mixed,
  message?: string,
  rawTransaction?: mixed,
  status?: 'pending' | 'complete';
};

export type ProcessDepositBaseRequest = {
  account?: string,
  accountHolder?: string | null,
  externalTransactionId: string,
  accountParameters?: mixed,
  message: string,
  rawTransaction?: mixed,
  status?: 'pending' | 'complete' | 'settled';
  paymentCost?: Money,
};

export type ProcessDepositWithAmountRequest = {
  amount: Money,
  withoutAmount?: false,
  ...ProcessDepositBaseRequest,
};

export type ProcessDepositWithoutAmountRequest = {
  withoutAmount: true,
  ...ProcessDepositBaseRequest,
};

export type ProcessDepositRequest = ProcessDepositWithAmountRequest | ProcessDepositWithoutAmountRequest;

export type QueryForPaymentsRequest = {
  startDate: Date,
  endDate?: Date,
  paymentType?: PaymentType,
  paymentStatus?: PaymentStatus,
  psp?: {
    provider: PaymentProvider,
    method: string,
  },
  parameters?: Object,
}

export type DepositResponse = {
  depositId: string,
  playerId: Id,
  balance: Balance,
  accountId: Id,
};

export type WithdrawalStatusRequest = {
  externalTransactionId: string,
  message: ?string,
  rawTransaction: ?mixed,
  paymentCost?: Money,
};

export type WithdrawalStatusResponse = {
  complete: ?boolean,
  paymentId: ?string,
};

export type DepositStatusRequest = {
  message: string,
  rawTransaction: mixed,
};

export type DepositStatusResponse = {
} & OkResult;

export type GetDepositResponse = {
  balance: Balance,
  deposit: Deposit,
};

export type GetWithdrawalResponse = {
  balance: Balance,
  withdrawal: Withdrawal,
};

export type DocumentType = 'other' | 'utility_bill' | 'identification' | 'payment_method' | 'source_of_wealth';
export type CreateDocumentRequest = {
  type: DocumentType,
  content?: string,
  fields: any,
  source: string,
  accountId?: Id,
  status?: 'new' | 'checked' | 'outdated',
  photoId?: string,
};

export type CreateDocumentResponse = {
  updated: boolean,
} & OkResult;

export type EmailStatus = 'unknown' | 'unverified' | 'verified' | 'failed';
export type MobilePhoneStatus = 'unknown' | 'unverified' | 'verified' | 'failed';

export type TemporaryPlayerRequest = Partial<Player>;
export type TemporaryPlayerResponse = {
  isDeposit: boolean, // TODO: that's the result of a bad design of the api. have to be removed at some point
};

export type RegisterPartialPlayerRequest = {
  transactionKey: string,
  player: Partial<Player>,
};

export type FailPartialLoginResponse = Partial<PartialLogin>
export type UpdateAccountHolderRequest = {
  accountHolder: string,
};

export type ReportRequest = {
  date: Date,
};

export type RegistrationReportResponse = {
  playerId: Id,
  countryCode: string,
  bannerTag: string,
  registrationIP: IPAddress,
  registrationDate: Date,
  username: string,
};

export type ActivitiesReportResponse = {
  transferId: string,
  playerId: Id,
  activityDate: string, // day
  brandId: string,
  affiliateId: Id,
  grossRevenue: Money,
  bonuses: Money,
  adjustments: Money,
  turnover: Money,
  deposits: Money,
};

export type GameManufacturersResponse = {
  id: string,
  name: string,
  parentId: ?string,
  license: string,
  active: boolean,
};

const config = require('../config');
const request = require('../request')('backend-payment-api', config.api.backend.url);

const parseBrandId = (username: string): BrandId => {
  if (username == null) {
    throw Error('Missing username');
  }
  const tokens = username.split('_');
  if (!tokens[0] || tokens[0].length !== 2) {
    throw Error('Invalid username');
  }
  const [brandId] = tokens;
  return ((brandId: any): BrandId);
};

const doAuthenticatedReq = (username: string, method: HttpMethod, path: string, body: mixed, formData?: Object): Promise<any> => {
  const brandId = parseBrandId(username);
  const token = config.api.backend.staticTokens[brandId];

  return request(method, `/api/${brandId}/v1/${path}`, body, { Authorization: `Bearer ${username}`, 'X-Token': token}, undefined, undefined, formData);
};

const doBrandPlayerReq = (brandId: BrandId, playerId: Id, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { Authorization: `Beerer ${playerId}`, 'X-Token': token });
};

const doBrandContextReq = (brandId: BrandId, method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens[brandId];
  return request(method, `/api/${brandId}/v1/${path}`, body, { 'X-Token': token });
};

const doAnonymousReq = (method: HttpMethod, path: string, body: mixed): Promise<any> => {
  const token = config.api.backend.staticTokens.LD;
  return request(method, `/api/LD/v1/${path}`, body, { 'X-Token': token });
};

const session = async (username: string, token: string): Promise<PlayerWithDetails> => {
  const brandId = parseBrandId(username);
  const xtoken = config.api.backend.staticTokens[brandId];
  return request('GET', `/api/${brandId}/v1/details`, {}, { Authorization: `Token ${token}`, 'X-Token': xtoken });
};

const balance = async (username: string): Promise<Balance> =>
  doAuthenticatedReq(username, 'GET', 'balance', {});

const details = async (username: string): Promise<PlayerWithDetails> =>
  doAuthenticatedReq(username, 'GET', 'details', {});

const getDeposit = async (username: string, transactionKey: UUID): Promise<GetDepositResponse> =>
  doAuthenticatedReq(username, 'GET', `deposit/${transactionKey}`, {});

const getDepositAlt = async (transactionKey: UUID): Promise<GetDepositResponse> =>
  doAnonymousReq('GET', `deposit/${transactionKey}`, {});

const getWithdrawal = async (username: string, transactionKey: UUID): Promise<GetWithdrawalResponse> =>
  doAuthenticatedReq(username, 'GET', `withdrawal/${transactionKey}`, {});

const getWithdrawalDetails = async (transactionKey: UUID): Promise<GetWithdrawalResponse> =>
  doAnonymousReq('GET', `withdrawal/${transactionKey}/details`, {});

const startDeposit = async (username: string, data: StartDepositRequest): Promise<PlayerWithDetails> =>
  doAuthenticatedReq(username, 'POST', 'details', data);

const updateDeposit = async (username: string, transactionKey: UUID, data: UpdateDepositRequest): Promise<DepositResponse> =>
  doAuthenticatedReq(username, 'PUT', `deposit/${transactionKey}`, data);

const processDeposit = async (username: string, transactionKey: UUID, data: ProcessDepositRequest): Promise<DepositResponse> =>
  doAuthenticatedReq(username, 'POST', `deposit/${transactionKey}`, data);

const processDepositAlt = async (transactionKey: UUID, data: ProcessDepositRequest): Promise<DepositResponse> =>
  doAnonymousReq('POST', `deposit/${transactionKey}`, data);

const setWithdrawalStatus = async (username: string, transactionKey: UUID, status: WithdrawalStatus, data: WithdrawalStatusRequest): Promise<WithdrawalStatusResponse> =>
  doAuthenticatedReq(username, 'POST', `withdrawal/${transactionKey}/${status}`, data);

const createWageringRequirement = async (username: string, transactionKey: UUID, wageringRequirement: Money): Promise<any> =>
  doAuthenticatedReq(username, 'PUT', `deposit/${transactionKey}/wager`, { wageringRequirement });

const setDepositStatus = async (username: string, transactionKey: UUID, status: DepositStatus, data: DepositStatusRequest): Promise<DepositStatusResponse> =>
  doAuthenticatedReq(username, 'POST', `deposit/${transactionKey}/${status}`, data);

const setDepositStatusAlt = async (transactionKey: UUID, status: DepositStatus, data: DepositStatusRequest): Promise<DepositStatusResponse> =>
  doAnonymousReq('POST', `deposit/${transactionKey}/${status}`, data);

const getGameManufacturers = async (countryId?: CountryId): Promise<GameManufacturersResponse[]> =>
  doAnonymousReq('GET', `game-manufacturers`, { countryId });

const addDocument = async (username: string, data: CreateDocumentRequest): Promise<CreateDocumentResponse> =>
  doAuthenticatedReq(username, 'POST', 'documents', data);

const uploadDocument = async (username: string, document: Buffer): Promise<{ photoId: string, originalName: string }> =>
  doAuthenticatedReq(username, 'POST', 'upload', null, { photo: document });

const failPartialLogin = async (brandId: BrandId, transactionKey: UUID, parameters: any): Promise<FailPartialLoginResponse> =>
  doBrandContextReq(brandId, 'DELETE', `partial/login/${transactionKey}`, parameters);

const getPartialLogin = async (brandId: BrandId, transactionKey: UUID): Promise<PartialLoginWithParameters> =>
  doBrandContextReq(brandId, 'GET', `partial/login/${transactionKey}`);

const registerPartialPlayer = async (brandId: BrandId, data: RegisterPartialPlayerRequest): Promise<TemporaryPlayerResponse> =>
  doBrandContextReq(brandId, 'POST', 'partial/player', data);

const updatePartialPlayer = async (brandId: BrandId, playerId: Id, data: TemporaryPlayerRequest): Promise<TemporaryPlayerResponse> =>
  doBrandContextReq(brandId, 'PUT', `partial/player/${playerId}`, data);

const getPlayerDetails = async (brandId: BrandId): Promise<PlayerWithDetails> =>
  doBrandContextReq(brandId, 'GET', 'details');

const updatePlayerDetails = async (brandId: BrandId, playerId: Id, data: PlayerUpdateDetailsDraft): Promise<Player> =>
  doBrandPlayerReq(brandId, playerId, 'POST', 'details', data);

const getAccount = async (username: string, accountId: Id): Promise<any> => // TODO: use flow type
  doAuthenticatedReq(username, 'GET', `accounts/${accountId}`);

const updateAccountParameters = async (username: string, accountId: Id, parameters: mixed): Promise<OkResult> =>
  doAuthenticatedReq(username, 'PUT', `accounts/${accountId}/parameters`, parameters);

const updateAccountHolder = async (brandId: BrandId, accountId: Id, data: UpdateAccountHolderRequest): Promise<OkResult> =>
  doBrandContextReq(brandId, 'POST', `accounts/${accountId}/holder/`, data);

const affiliateRegistrationsReport = async (brandId: BrandId, data: ReportRequest): Promise<RegistrationReportResponse[]> =>
  doBrandContextReq(brandId, 'PUT', 'reports/registrations/', data);

const affiliateActivitiesReport = async (brandId: BrandId, data: ReportRequest): Promise<ActivitiesReportResponse[]> =>
  doBrandContextReq(brandId, 'PUT', 'reports/activities/', data);

const getConversionRates = async (): Promise<{ conversionRates: ConversionRate[] }> =>
  doAnonymousReq('GET', 'currencies/rates');
const queryForPayments = async (
  query: QueryForPaymentsRequest,
): Promise<{ id: Id, transactionKey: string }[]> => doAnonymousReq('POST', 'query/payments', query); // TODO: refine flow type

module.exports = {
  parseBrandId,
  session,
  balance,
  details,
  getDeposit,
  getDepositAlt,
  getGameManufacturers,
  getWithdrawal,
  getWithdrawalDetails,
  startDeposit,
  updateDeposit,
  processDeposit,
  processDepositAlt,
  setWithdrawalStatus,
  createWageringRequirement,
  setDepositStatus,
  setDepositStatusAlt,
  addDocument,
  uploadDocument,
  failPartialLogin,
  getPartialLogin,
  registerPartialPlayer,
  updatePartialPlayer,
  getPlayerDetails,
  updatePlayerDetails,
  getAccount,
  updateAccountParameters,
  updateAccountHolder,
  affiliateRegistrationsReport,
  affiliateActivitiesReport,
  getConversionRates,
  queryForPayments
};
