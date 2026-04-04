// Base API client
export { apiClient, ApiError } from './client';

// Auth client
export {
  login,
  refresh,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyMfa,
  requestMfaCode,
  changePassword,
  acceptTerms,
  type GoLoginRequest,
  type GoLoginResponse,
  type GoRefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type VerifyEmailRequest,
  type VerifyEmailResponse,
  type VerifyMfaRequest,
  type VerifyMfaResponse,
  type RequestMfaCodeRequest,
  type RequestMfaCodeResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type AcceptTermsRequest,
  type AcceptTermsResponse
} from './auth-client';

// Betting client
export {
  placeBet,
  placeParlay,
  getUserBets,
  getBet,
  getCashoutOffer,
  cashoutBet,
  precheckBets,
  type PlaceBetRequest,
  type PlaceParlayRequest,
  type PrecheckBetsRequest,
  type PlaceBetResponse,
  type PlaceParlayResponse,
  type UserBet,
  type BetSelection,
  type CashoutOffer,
  type CashoutResponse,
  type PrecheckBetsResponse
} from './betting-client';

// Events client
export {
  getSports,
  getLeagues,
  getEvents,
  getEvent,
  type GetEventsParams,
  type Sport,
  type League,
  type Event,
  type EventDetail,
  type GetEventsPaginatedResponse
} from './events-client';

// Markets client
export {
  getMarkets,
  getMarket,
  type GetMarketsParams,
  type Market,
  type MarketSelection
} from './markets-client';

// Wallet client
export {
  getBalance,
  deposit,
  withdraw,
  getTransactions,
  type DepositRequest,
  type WithdrawRequest,
  type GetTransactionsParams,
  type Balance,
  type DepositResponse,
  type WithdrawResponse,
  type Transaction,
  type GetTransactionsPaginatedResponse
} from './wallet-client';

// User client
export {
  getProfile,
  updateProfile,
  updatePreferences,
  deleteAccount,
  type UpdateProfileRequest,
  type UpdatePreferencesRequest,
  type UserProfile,
  type Preferences,
  type DeleteAccountResponse
} from './user-client';

// Compliance client
export {
  setDepositLimits,
  setStakeLimits,
  setSessionLimits,
  coolOff,
  selfExclude,
  getLimitsHistory,
  type SetDepositLimitsRequest,
  type SetStakeLimitsRequest,
  type SetSessionLimitsRequest,
  type CoolOffRequest,
  type SelfExcludeRequest,
  type DepositLimits,
  type StakeLimits,
  type SessionLimits,
  type CoolOffResponse,
  type SelfExcludeResponse,
  type GetLimitsHistoryResponse,
  type LimitHistoryItem
} from './compliance-client';
