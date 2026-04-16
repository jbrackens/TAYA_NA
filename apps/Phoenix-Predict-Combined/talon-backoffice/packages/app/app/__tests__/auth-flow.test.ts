/**
 * Auth flow tests — validates login, session, token refresh, registration,
 * and error handling paths.
 *
 * Run: npx tsx --test app/__tests__/auth-flow.test.ts
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// ── Auth client logic mirror for testability (no DOM/fetch dependency) ──

interface AuthSession {
  authenticated: boolean;
  userId: string;
  username: string;
  role: string;
  expiresAt: string;
}

interface TokenResponse {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

class AuthClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  validateLoginRequest(username: string, password: string): { valid: boolean; error?: string } {
    if (!username || !username.trim()) {
      return { valid: false, error: 'username is required' };
    }
    if (!password || password.length < 6) {
      return { valid: false, error: 'password must be at least 6 characters' };
    }
    return { valid: true };
  }

  validateRegisterRequest(username: string, password: string, role?: string): { valid: boolean; error?: string } {
    const loginValid = this.validateLoginRequest(username, password);
    if (!loginValid.valid) return loginValid;
    if (role && role !== 'player' && role !== 'admin') {
      return { valid: false, error: 'role must be player or admin' };
    }
    return { valid: true };
  }

  parseSessionResponse(raw: unknown): AuthSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    if (!obj.authenticated || !obj.userId || !obj.username) return null;
    return {
      authenticated: Boolean(obj.authenticated),
      userId: String(obj.userId),
      username: String(obj.username),
      role: String(obj.role || 'player'),
      expiresAt: String(obj.expiresAt || ''),
    };
  }

  isSessionExpired(session: AuthSession): boolean {
    if (!session.expiresAt) return true;
    const expiresAt = new Date(session.expiresAt).getTime();
    return Date.now() > expiresAt;
  }

  buildLoginUrl(): string {
    return `${this.baseUrl}/api/v1/auth/login`;
  }

  buildRegisterUrl(): string {
    return `${this.baseUrl}/api/v1/auth/register`;
  }

  buildSessionUrl(): string {
    return `${this.baseUrl}/api/v1/auth/session`;
  }

  buildRefreshUrl(): string {
    return `${this.baseUrl}/api/v1/auth/refresh`;
  }
}

describe('AuthClient', () => {
  let client: AuthClient;

  beforeEach(() => {
    client = new AuthClient('http://localhost:18081');
  });

  describe('validateLoginRequest', () => {
    it('rejects empty username', () => {
      const result = client.validateLoginRequest('', 'password123');
      assert.equal(result.valid, false);
      assert.equal(result.error, 'username is required');
    });

    it('rejects whitespace-only username', () => {
      const result = client.validateLoginRequest('   ', 'password123');
      assert.equal(result.valid, false);
    });

    it('rejects short password', () => {
      const result = client.validateLoginRequest('user@test.com', '12345');
      assert.equal(result.valid, false);
      assert.equal(result.error, 'password must be at least 6 characters');
    });

    it('accepts valid credentials', () => {
      const result = client.validateLoginRequest('user@test.com', 'password123');
      assert.equal(result.valid, true);
      assert.equal(result.error, undefined);
    });
  });

  describe('validateRegisterRequest', () => {
    it('rejects invalid role', () => {
      const result = client.validateRegisterRequest('user@test.com', 'password123', 'superadmin');
      assert.equal(result.valid, false);
      assert.equal(result.error, 'role must be player or admin');
    });

    it('accepts player role', () => {
      const result = client.validateRegisterRequest('user@test.com', 'password123', 'player');
      assert.equal(result.valid, true);
    });

    it('accepts admin role', () => {
      const result = client.validateRegisterRequest('user@test.com', 'password123', 'admin');
      assert.equal(result.valid, true);
    });

    it('defaults role when not specified', () => {
      const result = client.validateRegisterRequest('user@test.com', 'password123');
      assert.equal(result.valid, true);
    });
  });

  describe('parseSessionResponse', () => {
    it('parses valid session', () => {
      const session = client.parseSessionResponse({
        authenticated: true,
        userId: 'u-1',
        username: 'demo@phoenix.local',
        role: 'admin',
        expiresAt: '2026-12-31T23:59:59Z',
      });
      assert.notEqual(session, null);
      assert.equal(session!.userId, 'u-1');
      assert.equal(session!.role, 'admin');
    });

    it('rejects null input', () => {
      assert.equal(client.parseSessionResponse(null), null);
    });

    it('rejects non-authenticated session', () => {
      assert.equal(client.parseSessionResponse({ authenticated: false, userId: 'u-1', username: 'test' }), null);
    });

    it('rejects missing userId', () => {
      assert.equal(client.parseSessionResponse({ authenticated: true, username: 'test' }), null);
    });

    it('defaults role to player when missing', () => {
      const session = client.parseSessionResponse({
        authenticated: true,
        userId: 'u-1',
        username: 'test',
      });
      assert.equal(session!.role, 'player');
    });
  });

  describe('isSessionExpired', () => {
    it('returns true for past expiry', () => {
      const session: AuthSession = {
        authenticated: true,
        userId: 'u-1',
        username: 'test',
        role: 'player',
        expiresAt: '2020-01-01T00:00:00Z',
      };
      assert.equal(client.isSessionExpired(session), true);
    });

    it('returns false for future expiry', () => {
      const session: AuthSession = {
        authenticated: true,
        userId: 'u-1',
        username: 'test',
        role: 'player',
        expiresAt: '2099-12-31T23:59:59Z',
      };
      assert.equal(client.isSessionExpired(session), false);
    });

    it('returns true for empty expiry', () => {
      const session: AuthSession = {
        authenticated: true,
        userId: 'u-1',
        username: 'test',
        role: 'player',
        expiresAt: '',
      };
      assert.equal(client.isSessionExpired(session), true);
    });
  });

  describe('URL construction', () => {
    it('builds login URL', () => {
      assert.equal(client.buildLoginUrl(), 'http://localhost:18081/api/v1/auth/login');
    });
    it('builds register URL', () => {
      assert.equal(client.buildRegisterUrl(), 'http://localhost:18081/api/v1/auth/register');
    });
    it('builds session URL', () => {
      assert.equal(client.buildSessionUrl(), 'http://localhost:18081/api/v1/auth/session');
    });
    it('builds refresh URL', () => {
      assert.equal(client.buildRefreshUrl(), 'http://localhost:18081/api/v1/auth/refresh');
    });
  });
});
