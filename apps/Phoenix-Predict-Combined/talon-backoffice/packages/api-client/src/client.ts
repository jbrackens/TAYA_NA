/**
 * Phoenix Sportsbook API Client
 * Type-safe API client with automatic auth token management and 401 refresh
 */

import { AuthManager, createAuthManager } from './auth';
import {
  ApiClientConfig,
  ApiError,
  TokenResponse,
  SessionResponse,
  ErrorResponse,
  LoginRequest,
  RefreshRequest,
  ListResponse,
  SimpleListResponse,
  Fixture,
  Market,
  Bet,
  BetPrecheckResult,
  CashoutQuote,
  WalletBalance,
  WalletLedgerEntry,
  WalletMutationResponse,
  WalletMutationRequest,
  Freebet,
  OddsBoost,
  MatchTrackerTimeline,
  AdminPunter,
  AdminMarketView,
  AuditLogEntry,
  SportCatalogItem,
  SportLeagueItem,
  SportEventItem,
  PaginationOptions,
  PlaceBetRequest,
  PrecheckBetRequest,
  CashoutQuoteRequest,
  CashoutAcceptRequest,
  OddsBoostAcceptRequest,
  ProviderCancelRequest,
} from './types';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 100;

export class PhoenixApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private authManager: AuthManager;
  private refreshInProgress: Promise<boolean> | null = null;

  constructor(config: ApiClientConfig, authManager?: AuthManager) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retryAttempts = config.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
    this.retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY;
    this.authManager = authManager ?? createAuthManager();
  }

  /**
   * Set auth manager instance
   */
  setAuthManager(authManager: AuthManager): void {
    this.authManager = authManager;
  }

  /**
   * Get auth manager instance
   */
  getAuthManager(): AuthManager {
    return this.authManager;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authManager.isAuthenticated();
  }

  /**
   * Clear all auth tokens
   */
  logout(): void {
    this.authManager.clearTokens();
  }

  // ===== Auth Endpoints =====

  /**
   * Login with username and password
   */
  async login(request: LoginRequest): Promise<TokenResponse> {
    const response = await this.post<TokenResponse>('/api/v1/auth/login', request);
    // Store tokens if refreshToken is returned
    if (response.accessToken) {
      this.authManager.setTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
    }
    return response;
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(request: RefreshRequest): Promise<TokenResponse> {
    const response = await this.post<TokenResponse>('/api/v1/auth/refresh', request);
    if (response.accessToken) {
      this.authManager.setTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
    }
    return response;
  }

  /**
   * Get current session info (requires auth)
   */
  async getSession(): Promise<SessionResponse> {
    return this.get<SessionResponse>('/api/v1/auth/session');
  }

  // ===== Fixtures & Markets =====

  /**
   * List fixtures with pagination
   */
  async listFixtures(options?: PaginationOptions & { tournament?: string }): Promise<ListResponse<Fixture>> {
    const params = this.buildQueryParams(options);
    return this.get<ListResponse<Fixture>>('/api/v1/fixtures', params);
  }

  /**
   * Get fixture detail with markets
   */
  async getFixture(fixtureId: string): Promise<Fixture> {
    return this.get<Fixture>(`/api/v1/fixtures/${fixtureId}`);
  }

  /**
   * List markets with pagination
   */
  async listMarkets(
    options?: PaginationOptions & { status?: string; fixtureId?: string }
  ): Promise<ListResponse<Market>> {
    const params = this.buildQueryParams(options);
    return this.get<ListResponse<Market>>('/api/v1/markets', params);
  }

  /**
   * Get market detail with selections
   */
  async getMarket(marketId: string): Promise<Market> {
    return this.get<Market>(`/api/v1/markets/${marketId}`);
  }

  // ===== Sports =====

  /**
   * List all sports catalog
   */
  async listSports(): Promise<{ items: SportCatalogItem[] }> {
    return this.get<{ items: SportCatalogItem[] }>('/api/v1/sports');
  }

  /**
   * Get sport detail with leagues
   */
  async getSportLeagues(sportKey: string): Promise<{ sportKey: string; items: SportLeagueItem[] }> {
    return this.get<{ sportKey: string; items: SportLeagueItem[] }>(`/api/v1/sports/${sportKey}`);
  }

  /**
   * List sport events
   */
  async listSportEvents(
    sportKey: string,
    options?: PaginationOptions & { status?: string; leagueKey?: string }
  ): Promise<{ sportKey: string; items: SportEventItem[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get(`/api/v1/sports/${sportKey}/events`, params);
  }

  /**
   * List markets for a sport event
   */
  async listSportEventMarkets(
    sportKey: string,
    eventKey: string,
    options?: PaginationOptions
  ): Promise<{ sportKey: string; eventKey: string; fixtureId: string; items: Market[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get(`/api/v1/sports/${sportKey}/events/${eventKey}/markets`, params);
  }

  // ===== Betting =====

  /**
   * Precheck bet before placement
   */
  async precheckBet(request: PrecheckBetRequest): Promise<BetPrecheckResult> {
    return this.post<BetPrecheckResult>('/api/v1/bets/precheck', request);
  }

  /**
   * Place a single bet
   */
  async placeBet(request: PlaceBetRequest): Promise<Bet> {
    return this.post<Bet>('/api/v1/bets/place', request);
  }

  /**
   * Get bet by ID
   */
  async getBet(betId: string): Promise<Bet> {
    return this.get<Bet>(`/api/v1/bets/${betId}`);
  }

  /**
   * Get cashout quote for a bet
   */
  async getCashoutQuote(request: CashoutQuoteRequest): Promise<CashoutQuote> {
    return this.post<CashoutQuote>('/api/v1/bets/cashout/quote', request);
  }

  /**
   * Accept cashout quote
   */
  async acceptCashout(request: CashoutAcceptRequest): Promise<{ bet: Bet; quote: CashoutQuote }> {
    return this.post<{ bet: Bet; quote: CashoutQuote }>('/api/v1/bets/cashout/accept', request);
  }

  // ===== Wallet =====

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string): Promise<WalletBalance> {
    return this.get<WalletBalance>(`/api/v1/wallet/${userId}`);
  }

  /**
   * Get wallet ledger
   */
  async getWalletLedger(userId: string, limit?: number): Promise<{ userId: string; items: WalletLedgerEntry[]; total: number }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return this.get(`/api/v1/wallet/${userId}/ledger`, params);
  }

  /**
   * Credit wallet
   */
  async creditWallet(request: WalletMutationRequest): Promise<WalletMutationResponse> {
    return this.post<WalletMutationResponse>('/api/v1/wallet/credit', request);
  }

  /**
   * Debit wallet
   */
  async debitWallet(request: WalletMutationRequest): Promise<WalletMutationResponse> {
    return this.post<WalletMutationResponse>('/api/v1/wallet/debit', request);
  }

  // ===== Promotions =====

  /**
   * List freebets for user
   */
  async listFreebets(userId: string, status?: string): Promise<SimpleListResponse<Freebet>> {
    const params = new URLSearchParams();
    params.append('userId', userId);
    if (status) params.append('status', status);
    return this.get<SimpleListResponse<Freebet>>('/api/v1/freebets', params);
  }

  /**
   * Get freebet detail
   */
  async getFreebet(freebetId: string): Promise<Freebet> {
    return this.get<Freebet>(`/api/v1/freebets/${freebetId}`);
  }

  /**
   * List odds boosts for user
   */
  async listOddsBoosts(userId: string, status?: string): Promise<SimpleListResponse<OddsBoost>> {
    const params = new URLSearchParams();
    params.append('userId', userId);
    if (status) params.append('status', status);
    return this.get<SimpleListResponse<OddsBoost>>('/api/v1/odds-boosts', params);
  }

  /**
   * Get odds boost detail
   */
  async getOddsBoost(oddsBoostId: string): Promise<OddsBoost> {
    return this.get<OddsBoost>(`/api/v1/odds-boosts/${oddsBoostId}`);
  }

  /**
   * Accept odds boost
   */
  async acceptOddsBoost(oddsBoostId: string, request: OddsBoostAcceptRequest): Promise<OddsBoost> {
    return this.post<OddsBoost>(`/api/v1/odds-boosts/${oddsBoostId}/accept`, request);
  }

  // ===== Match Tracking =====

  /**
   * Get match tracker timeline for fixture
   */
  async getMatchTracker(fixtureId: string): Promise<MatchTrackerTimeline> {
    return this.get<MatchTrackerTimeline>(`/api/v1/match-tracker/fixtures/${fixtureId}`);
  }

  // ===== Admin =====

  /**
   * List fixtures (admin only)
   */
  async adminListFixtures(options?: PaginationOptions & { tournament?: string }): Promise<{ items: Fixture[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get('/admin/fixtures', params);
  }

  /**
   * List markets (admin only)
   */
  async adminListMarkets(
    options?: PaginationOptions & { status?: string; fixtureId?: string }
  ): Promise<{ items: AdminMarketView[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get('/admin/markets', params);
  }

  /**
   * List punters (admin only)
   */
  async adminListPunters(options?: PaginationOptions & { status?: string }): Promise<{ items: AdminPunter[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get('/admin/punters', params);
  }

  /**
   * List audit logs (admin only)
   */
  async adminListAuditLogs(options?: PaginationOptions): Promise<{ items: AuditLogEntry[]; pagination: any }> {
    const params = this.buildQueryParams(options);
    return this.get('/admin/audit-logs', params);
  }

  /**
   * Cancel provider operation (admin only)
   */
  async adminCancelProvider(request: ProviderCancelRequest): Promise<{ status: string }> {
    return this.post('/admin/provider/cancel', request);
  }

  /**
   * Get risk rankings (admin only)
   */
  async adminGetRiskRankings(limit?: number): Promise<{ items: any[] }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return this.get('/admin/risk/rankings', params);
  }

  /**
   * Get player risk score (admin only)
   */
  async adminGetPlayerScore(userId: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('userId', userId);
    return this.get('/admin/risk/player-scores', params);
  }

  /**
   * Get risk segments (admin only)
   */
  async adminGetRiskSegments(userId?: string, limit?: number): Promise<{ items: any[]; total: number }> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (limit) params.append('limit', limit.toString());
    return this.get('/admin/risk/segments', params);
  }

  // ===== Internal HTTP Methods =====

  /**
   * Make GET request with auth and retry logic
   */
  private async get<T>(
    path: string,
    params?: URLSearchParams | Record<string, string>
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>('GET', url);
  }

  /**
   * Make POST request with auth and retry logic
   */
  private async post<T>(path: string, body?: any): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>('POST', url, body);
  }

  /**
   * Make HTTP request with automatic auth, 401 refresh, and retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    body?: any,
    retryCount: number = 0
  ): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        if (await this.tryRefreshToken()) {
          // Retry with new token
          if (retryCount < this.retryAttempts) {
            return this.request<T>(method, url, body, retryCount + 1);
          }
        }
        // Refresh failed or max retries exceeded - logout
        this.authManager.clearTokens();
        throw this.createApiError('Unauthorized', response, false, retryCount);
      }

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        // Retry on 5xx errors (server errors)
        const isRetryable = response.status >= 500;
        if (isRetryable && retryCount < this.retryAttempts) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount));
          return this.request<T>(method, url, body, retryCount + 1);
        }
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error(`Network request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Try to refresh the access token
   */
  private async tryRefreshToken(): Promise<boolean> {
    // Prevent concurrent refresh attempts
    if (this.refreshInProgress) {
      return this.refreshInProgress;
    }

    const refreshToken = this.authManager.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.refreshInProgress = (async () => {
      try {
        const response = await this.post<TokenResponse>('/api/v1/auth/refresh', {
          refreshToken,
        });
        this.authManager.setTokens(response.accessToken, response.refreshToken, response.expiresInSeconds);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshInProgress = null;
      }
    })();

    return this.refreshInProgress;
  }

  /**
   * Fetch with timeout
   */
  private fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    return fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  }

  /**
   * Build Authorization and other headers
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const authHeader = this.authManager.getAuthHeader();
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    return headers;
  }

  /**
   * Build full URL with query params
   */
  private buildUrl(path: string, params?: URLSearchParams | Record<string, string>): string {
    const url = new URL(path, this.baseUrl);

    if (params) {
      if (params instanceof URLSearchParams) {
        url.search = params.toString();
      } else {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.append(key, String(value));
          }
        });
      }
    }

    return url.toString();
  }

  /**
   * Build query params from options
   */
  private buildQueryParams(options?: Record<string, any>): Record<string, string> {
    const params: Record<string, string> = {};
    if (!options) return params;

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    return params;
  }

  /**
   * Handle error response
   */
  private async handleErrorResponse(response: Response): Promise<ApiError> {
    let errorData: ErrorResponse | undefined;

    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    return this.createApiError(errorData?.message || response.statusText, response, false, 0);
  }

  /**
   * Create ApiError
   */
  private createApiError(
    message: string,
    response: Response,
    retryable: boolean,
    retryCount: number
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.name = 'ApiError';
    error.status = response.status;
    error.retryable = retryable;
    error.retryCount = retryCount;
    return error;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
