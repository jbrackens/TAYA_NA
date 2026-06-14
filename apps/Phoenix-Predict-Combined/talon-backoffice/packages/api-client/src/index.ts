/**
 * Taya NA Predict API client entrypoint.
 *
 * The legacy Phoenix sportsbook exports remain available because the player
 * app still uses shared auth, wallet, and compliance infrastructure. New
 * prediction-market work should import PredictionApiClient or
 * createPredictionClient from this package entrypoint instead of reaching into
 * src/prediction-client directly.
 */

export { PhoenixApiClient } from "./client";
export {
  AuthManager,
  createAuthManager,
  decodeJWT,
  isJWTExpired,
} from "./auth";
export {
  PredictionApiClient,
  createPredictionClient,
} from "./prediction-client";
export type { AuthTokens } from "./auth";

// Type exports
export type {
  TokenResponse,
  SessionResponse,
  ErrorResponse,
  PaginationMeta,
  WalletBalance,
  WalletLedgerEntry,
  WalletMutationResponse,
  AuditLogEntry,
  LoginRequest,
  RefreshRequest,
  WalletMutationRequest,
  PaginationOptions,
  ListResponse,
  SimpleListResponse,
  ApiClientConfig,
} from "./types";

export { ApiError } from "./types";

export type {
  Category,
  PredictionEvent,
  PredictionMarket,
  PredictionOrder,
  Position,
  Trade,
  OrderPreview,
  PortfolioSummary,
  SettledPayout,
  DiscoveryResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  PaginatedResponse,
  CreateMarketRequest,
  MarketLifecycleAction,
  SettleMarketRequest,
  SettleMarketResponse,
  DashboardVolumeStats,
  OrderBook,
  DriftAlertsResponse,
} from "./prediction-types";
