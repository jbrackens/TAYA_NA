/**
 * Phoenix Sportsbook API Types
 * Auto-generated from OpenAPI specification
 */

export interface TokenResponse {
  tokenType: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
}

export interface SessionResponse {
  authenticated: boolean;
  userId: string;
  username: string;
  expiresAt: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface Fixture {
  id: string;
  tournament: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  status: 'scheduled' | 'in_play' | 'finished' | 'cancelled' | 'suspended';
}

export interface Selection {
  id: string;
  name: string;
  odds: number;
  status: string;
}

export interface Market {
  id: string;
  fixtureId: string;
  name: string;
  status: 'open' | 'suspended' | 'closed' | 'settled' | 'cancelled';
  startsAt: string;
  selections?: Selection[];
}

export interface SportCatalogItem {
  sportKey: string;
  name: string;
  leagueCount: number;
  eventCount: number;
}

export interface SportLeagueItem {
  leagueKey: string;
  name: string;
  eventCount: number;
}

export interface SportEventItem {
  eventKey: string;
  fixtureId: string;
  sportKey: string;
  leagueKey: string;
  leagueName: string;
  seasonKey?: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: 'scheduled' | 'in_play' | 'finished' | 'cancelled' | 'suspended';
  marketsTotalCount: number;
}

export interface Bet {
  betId: string;
  userId: string;
  marketId: string;
  selectionId: string;
  stakeCents: number;
  odds: number;
  status: 'pending' | 'accepted' | 'settled' | 'cancelled' | 'refunded';
  createdAt: string;
  settledAt?: string;
}

export interface BetPrecheckResult {
  valid: boolean;
  warnings: string[];
  estimatedReturns: number;
}

export interface CashoutQuote {
  quoteId: string;
  betId: string;
  amountCents: number;
  expiresAt: string;
}

export interface WalletBalance {
  userId: string;
  balanceCents: number;
}

export interface WalletLedgerEntry {
  entryId: string;
  userId: string;
  type: 'credit' | 'debit';
  amountCents: number;
  balanceCents: number;
  reason: string;
  createdAt: string;
}

export interface WalletMutationResponse {
  entry: WalletLedgerEntry;
  balanceCents: number;
}

export interface Freebet {
  freebetId: string;
  playerId: string;
  campaignId?: string;
  currency: string;
  totalAmountCents: number;
  remainingAmountCents: number;
  minOddsDecimal?: number;
  appliesToSportIds?: string[];
  appliesToTournamentIds?: string[];
  expiresAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OddsBoost {
  oddsBoostId: string;
  playerId: string;
  campaignId?: string;
  marketId: string;
  selectionId: string;
  currency: string;
  originalOdds: number;
  boostedOdds: number;
  maxStakeCents?: number;
  minOddsDecimal?: number;
  status: string;
  expiresAt: string;
  acceptedAt?: string;
  acceptRequestId?: string;
  acceptReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchTrackerScore {
  home: number;
  away: number;
}

export interface MatchTrackerIncident {
  incidentId: string;
  fixtureId: string;
  type: string;
  period?: string;
  clockSeconds?: number;
  score?: MatchTrackerScore;
  details?: Record<string, string>;
  occurredAt: string;
}

export interface MatchTrackerTimeline {
  fixtureId: string;
  status: 'scheduled' | 'in_play' | 'finished' | 'cancelled' | 'suspended';
  period?: string;
  clockSeconds?: number;
  score: MatchTrackerScore;
  incidents?: MatchTrackerIncident[];
  updatedAt: string;
}

export interface AdminPunter {
  userId: string;
  email: string;
  status: 'active' | 'suspended' | 'self_excluded' | 'deactivated';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminMarketView {
  id: string;
  fixtureId: string;
  name: string;
  status: string;
  startsAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  userId?: string;
  targetId: string;
  freebetId?: string;
  oddsBoostId?: string;
  freebetAppliedCents?: number;
  occurredAt: string;
  details: string;
}

// Request types

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface PlaceBetRequest {
  userId: string;
  requestId?: string;
  deviceId?: string;
  segmentId?: string;
  ipAddress?: string;
  oddsPrecision?: number;
  acceptAnyOdds?: boolean;
  marketId: string;
  selectionId: string;
  stakeCents: number;
  odds: number;
  freebetId?: string;
  oddsBoostId?: string;
  idempotencyKey: string;
}

export interface PrecheckBetRequest {
  userId: string;
  requestId?: string;
  deviceId?: string;
  segmentId?: string;
  ipAddress?: string;
  oddsPrecision?: number;
  acceptAnyOdds?: boolean;
  marketId: string;
  selectionId: string;
  stakeCents: number;
  odds: number;
  freebetId?: string;
  oddsBoostId?: string;
}

export interface CashoutQuoteRequest {
  betId: string;
  userId: string;
  requestId: string;
  providerAmountCents?: number;
  providerRevision?: number;
  providerSource?: string;
  providerExpiresAt?: string;
}

export interface CashoutAcceptRequest {
  betId: string;
  userId: string;
  quoteId: string;
  requestId: string;
  quoteRevision?: number;
  reason?: string;
}

export interface WalletMutationRequest {
  userId: string;
  amountCents: number;
  idempotencyKey: string;
  reason?: string;
}

export interface OddsBoostAcceptRequest {
  userId: string;
  requestId: string;
  reason?: string;
}

export interface ProviderCancelRequest {
  adapter: string;
  playerId: string;
  betId: string;
  requestId: string;
  reason?: string;
}

// Pagination options

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// List responses

export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface SimpleListResponse<T> {
  items: T[];
  totalCount: number;
}

// Config

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// HTTP error with retry info

export class ApiError extends Error {
  status: number;
  data?: ErrorResponse;
  retryable: boolean;
  retryCount: number;

  constructor(message: string, status: number, retryable = false, retryCount = 0, data?: ErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
    this.retryCount = retryCount;
    this.data = data;
  }
}
