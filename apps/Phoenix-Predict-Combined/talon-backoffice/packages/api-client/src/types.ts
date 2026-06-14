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

export interface WalletMutationRequest {
  userId: string;
  amountCents: number;
  idempotencyKey: string;
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
