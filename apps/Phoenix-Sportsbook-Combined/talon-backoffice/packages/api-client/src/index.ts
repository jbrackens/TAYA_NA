/**
 * Phoenix Sportsbook API Client
 * Main entry point re-exporting all public APIs
 */

export { PhoenixApiClient } from './client';
export { AuthManager, createAuthManager, decodeJWT, isJWTExpired } from './auth';
export { PhoenixWebSocketClient } from './websocket';
export type { WebSocketConfig, WebSocketMessage, MessageHandler, ConnectionHandler, ErrorHandler } from './websocket';
export type { AuthTokens } from './auth';

// Type exports
export type {
  TokenResponse,
  SessionResponse,
  ErrorResponse,
  PaginationMeta,
  Fixture,
  Selection,
  Market,
  SportCatalogItem,
  SportLeagueItem,
  SportEventItem,
  Bet,
  BetPrecheckResult,
  CashoutQuote,
  WalletBalance,
  WalletLedgerEntry,
  WalletMutationResponse,
  Freebet,
  OddsBoost,
  MatchTrackerScore,
  MatchTrackerIncident,
  MatchTrackerTimeline,
  AdminPunter,
  AdminMarketView,
  AuditLogEntry,
  LoginRequest,
  RefreshRequest,
  PlaceBetRequest,
  PrecheckBetRequest,
  CashoutQuoteRequest,
  CashoutAcceptRequest,
  WalletMutationRequest,
  OddsBoostAcceptRequest,
  ProviderCancelRequest,
  PaginationOptions,
  ListResponse,
  SimpleListResponse,
  ApiClientConfig,
} from './types';

export { ApiError } from './types';
