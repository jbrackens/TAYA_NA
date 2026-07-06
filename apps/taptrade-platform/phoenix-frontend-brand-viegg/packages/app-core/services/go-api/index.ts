// Shared
export { goApi, clearAuth } from "./client";
export { transformGoError, isAppError } from "./errors";
export type { GoErrorResponse, GoPagination, GoPaginatedResponse, AppError } from "./types";

// Auth
export { useLogin, useLogout, useRegister } from "./auth/auth-hooks";
export { login, refresh, logout, register } from "./auth/auth-client";
export type {
  GoLoginRequest,
  GoLoginResponse,
  GoRefreshRequest,
  GoRefreshResponse,
  GoRegisterRequest,
  GoRegisterResponse,
} from "./auth/auth-types";

// Auth – Password Management
export { useForgotPassword, useChangePassword, useResetPasswordByToken } from "./auth/auth-hooks";
export { forgotPassword, changePassword, resetPasswordByToken } from "./auth/auth-client";
export type { GoForgotPasswordRequest, GoChangePasswordRequest, GoResetPasswordByTokenRequest } from "./auth/auth-types";

// User
export { useProfile, useUpdateProfile, userKeys } from "./user/user-hooks";
export { getProfile, updateProfile } from "./user/user-client";
export type { GoUserProfile, GoUpdateProfileRequest, GoAddress } from "./user/user-types";

// User – Account & Preferences
export { useDeleteAccount, useUpdatePreferences } from "./user/user-hooks";
export { deleteAccount, updatePreferences } from "./user/user-client";
export type { GoUpdatePreferencesRequest } from "./user/user-types";

// Wallet
export {
  useBalance,
  useDeposit,
  useWithdraw,
  useTransactions,
  walletKeys,
} from "./wallet/wallet-hooks";
export { getBalance, deposit, withdraw, getTransactions } from "./wallet/wallet-client";
export type {
  GoWallet,
  GoDepositRequest,
  GoDepositResponse,
  GoWithdrawRequest,
  GoWithdrawResponse,
  GoTransaction,
} from "./wallet/wallet-types";

// Wallet – Payment Transactions
export { usePaymentTransaction } from "./wallet/wallet-hooks";
export { getPaymentTransaction } from "./wallet/wallet-client";
export type { GoPaymentTransaction } from "./wallet/wallet-types";

// Events (Sportsbook)
export {
  useSports,
  useLeagues,
  useEvents,
  useEvent,
  eventsKeys,
} from "./events/events-hooks";
export { getSports, getLeagues, getEvents, getEvent } from "./events/events-client";
export type {
  GoSportsResponse,
  GoSport,
  GoLeaguesResponse,
  GoLeague,
  GoEventsResponse,
  GoEvent,
  GoLiveScore,
  GoEventResult,
  GoEventsQuery,
} from "./events/events-types";

// Markets
export { useMarkets, useMarket, marketsKeys } from "./markets/markets-hooks";
export { getMarkets, getMarket } from "./markets/markets-client";
export type {
  GoMarketsResponse,
  GoMarket,
  GoOutcome,
  GoMarketsQuery,
} from "./markets/markets-types";

// Betting
export {
  usePlaceBet,
  usePlaceParlay,
  useUserBets,
  useBet,
  useCashout,
  useCashoutOffer,
  bettingKeys,
} from "./betting/betting-hooks";
export {
  placeBet,
  placeParlay,
  getUserBets,
  getBet,
  cashoutBet,
  getCashoutOffer,
  precheckBets,
  getBetStatuses,
} from "./betting/betting-client";
export type {
  GoPlaceBetRequest,
  GoPlaceBetResponse,
  GoPlaceParlayRequest,
  GoPlaceParlayResponse,
  GoParlayLeg,
  GoUserBetsQuery,
  GoUserBetsResponse,
  GoBet,
  GoBetDetail,
  GoCashoutRequest,
  GoCashoutResponse,
  GoCashoutOffer,
  GoPrecheckRequest,
  GoPrecheckResponse,
  GoBetStatusRequest,
  GoBetStatusResponse,
} from "./betting/betting-types";

// Compliance (Responsible Gaming)
export {
  useSetDepositLimits,
  useSetStakeLimits,
  useSetSessionLimits,
  useCoolOff,
  useSelfExclude,
  useLimitsHistory,
  useCoolOffsHistory,
  useAcceptResponsibilityCheck,
  useCurrentSession,
  complianceKeys,
} from "./compliance/compliance-hooks";
export {
  setDepositLimits,
  setStakeLimits,
  setSessionLimits,
  coolOff,
  selfExclude,
  getLimitsHistory,
  getCoolOffsHistory,
  acceptResponsibilityCheck,
  getCurrentSession,
  getGeoComplyLicense,
  evaluateGeoComplyPacket,
} from "./compliance/compliance-client";
export type {
  GoSetLimitRequest,
  GoSetLimitResponse,
  GoCoolOffRequest,
  GoCoolOffResponse,
  GoSelfExcludeRequest,
  GoSelfExcludeResponse,
  GoLimitHistoryEntry,
  GoLimitHistoryResponse,
  GoCoolOffHistoryEntry,
  GoCoolOffHistoryResponse,
  GoResponsibilityCheckResponse,
  GoSessionInfo,
  GoGeoComplyLicenseResponse,
  GoGeoComplyPacketRequest,
  GoGeoComplyPacketResponse,
  GoGeoComplyTroubleshooterReason,
} from "./compliance/compliance-types";

// Terms & Conditions
export {
  useTerms,
  useTermsCurrent,
  useAcceptTerms,
  termsKeys,
} from "./terms/terms-hooks";
export { getTerms, getTermsCurrent, acceptTerms } from "./terms/terms-client";
export type {
  GoTermsResponse,
  GoAcceptTermsRequest,
  GoAcceptTermsResponse,
} from "./terms/terms-types";

// Verification / MFA / KYC
export {
  useRequestVerification,
  useRequestVerificationByPhone,
  useCheckVerification,
  useLoginWithVerification,
  useToggleMfa,
  useAnswerKbaQuestions,
  useStartIdpv,
  useCheckIdpvStatus,
} from "./verification/verification-hooks";
export {
  requestVerification,
  requestVerificationByPhone,
  checkVerification,
  loginWithVerification,
  toggleMfa,
  answerKbaQuestions,
  startIdpv,
  checkIdpvStatus,
} from "./verification/verification-client";
export type {
  GoVerificationRequestResponse,
  GoVerificationCheckRequest,
  GoVerificationCheckResponse,
  GoLoginWithVerificationRequest,
  GoLoginWithVerificationResponse,
  GoMfaToggleRequest,
  GoMfaToggleResponse,
  GoKbaQuestion,
  GoKbaAnswerRequest,
  GoKbaResponse,
  GoIdpvStartResponse,
  GoIdpvStatusResponse,
} from "./verification/verification-types";

// Retention (Freebets & Odds Boosts)
export {
  useFreebets,
  useOddsBoosts,
  useAcceptOddsBoost,
  retentionKeys,
} from "./retention/retention-hooks";
export {
  getFreebets,
  getFreebet,
  getOddsBoosts,
  getOddsBoost,
  acceptOddsBoost,
} from "./retention/retention-client";
export type {
  GoFreebet,
  GoFreebetsResponse,
  GoOddsBoost,
  GoOddsBoostsResponse,
  GoAcceptOddsBoostResponse,
} from "./retention/retention-types";

// Prediction Orders
export {
  usePredictionOrders,
  usePlacePredictionOrder,
  useCancelPredictionOrder,
  predictionKeys,
} from "./prediction/prediction-hooks";
export {
  getPredictionOrders,
  placePredictionOrder,
  cancelPredictionOrder,
} from "./prediction/prediction-client";
export type {
  GoPredictionOrder,
  GoPredictionOrdersResponse,
  GoPredictionPlaceOrderRequest,
  GoPredictionPlaceOrderResponse,
  GoPredictionCancelOrderResponse,
} from "./prediction/prediction-types";

// Sportsbook Enrichments
export {
  useMatchTracker,
  useFixtureStats,
  sportsbookKeys,
} from "./sportsbook/sportsbook-hooks";
export { getMatchTracker, getFixtureStats } from "./sportsbook/sportsbook-client";
export type {
  GoMatchTrackerResponse,
  GoMatchTrackerIncident,
  GoMatchTrackerScore,
  GoFixtureStatsResponse,
  GoFixtureStatMetric,
} from "./sportsbook/sportsbook-types";
