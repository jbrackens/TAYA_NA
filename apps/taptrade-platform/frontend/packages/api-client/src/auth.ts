/**
 * Auth utilities for token management and auth header injection
 */

const STORAGE_KEY_ACCESS = 'phoenix_access_token';
const STORAGE_KEY_REFRESH = 'phoenix_refresh_token';
const STORAGE_KEY_EXPIRES = 'phoenix_token_expires';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class AuthManager {
  private tokens: AuthTokens | null = null;
  private storage: Storage;
  private refreshInProgress: Promise<AuthTokens | null> | null = null;

  constructor(storage: Storage = typeof window !== 'undefined' ? window.localStorage : ({} as Storage)) {
    this.storage = storage;
    this.loadTokensFromStorage();
  }

  /**
   * Set auth tokens and persist to storage
   */
  setTokens(accessToken: string, refreshToken: string | undefined, expiresInSeconds: number): void {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    this.tokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };
    this.persistTokens();
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    if (!this.tokens) return null;
    if (this.isAccessTokenExpired()) {
      return null;
    }
    return this.tokens.accessToken;
  }

  /**
   * Get the refresh token
   */
  getRefreshToken(): string | null {
    return this.tokens?.refreshToken ?? null;
  }

  /**
   * Check if access token is expired
   */
  isAccessTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  /**
   * Check if we should refresh the token (e.g., within 2 minutes of expiry)
   */
  shouldRefreshToken(): boolean {
    if (!this.tokens) return false;
    const timeUntilExpiry = this.tokens.expiresAt - Date.now();
    const twoMinutesInMs = 2 * 60 * 1000;
    return timeUntilExpiry < twoMinutesInMs && timeUntilExpiry > 0;
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokens = null;
    try {
      this.storage.removeItem(STORAGE_KEY_ACCESS);
      this.storage.removeItem(STORAGE_KEY_REFRESH);
      this.storage.removeItem(STORAGE_KEY_EXPIRES);
    } catch {
      // Storage may be unavailable
    }
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(): string | null {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : null;
  }

  /**
   * Get all tokens
   */
  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Load tokens from storage
   */
  private loadTokensFromStorage(): void {
    try {
      const accessToken = this.storage.getItem(STORAGE_KEY_ACCESS);
      const refreshToken = this.storage.getItem(STORAGE_KEY_REFRESH);
      const expiresAtStr = this.storage.getItem(STORAGE_KEY_EXPIRES);

      if (!accessToken || !expiresAtStr) {
        this.tokens = null;
        return;
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      this.tokens = {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt,
      };
    } catch {
      this.tokens = null;
    }
  }

  /**
   * Persist tokens to storage
   */
  private persistTokens(): void {
    if (!this.tokens) return;

    try {
      this.storage.setItem(STORAGE_KEY_ACCESS, this.tokens.accessToken);
      if (this.tokens.refreshToken) {
        this.storage.setItem(STORAGE_KEY_REFRESH, this.tokens.refreshToken);
      }
      this.storage.setItem(STORAGE_KEY_EXPIRES, this.tokens.expiresAt.toString());
    } catch {
      // Storage may be unavailable
    }
  }
}

/**
 * Create default auth manager for browser environment
 */
export function createAuthManager(): AuthManager {
  if (typeof window !== 'undefined') {
    return new AuthManager(window.localStorage);
  }
  return new AuthManager({} as Storage);
}

/**
 * Extract JWT claims (without validation)
 */
export function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = decodeURIComponent(
      atob(parts[1])
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if JWT is expired
 */
export function isJWTExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  const expiryTime = decoded.exp * 1000; // Convert to milliseconds
  return Date.now() >= expiryTime;
}
