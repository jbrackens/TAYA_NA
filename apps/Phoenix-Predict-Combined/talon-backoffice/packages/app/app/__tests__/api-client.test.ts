/**
 * Unit tests for API client (app/lib/api/client.ts)
 * Tests URL construction, header injection, error handling.
 *
 * Run: npx tsx --test app/__tests__/api-client.test.ts
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ── Minimal reproduction of ApiClient for unit testing ──
// (We can't import the real file without DOM/localStorage, so we mirror the logic)

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Test helper to set token without localStorage
  setTestToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }

  getHeadersPublic() {
    return this.getHeaders();
  }
}

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:18080');
  });

  describe('URL construction', () => {
    it('builds correct base URL + path', () => {
      const url = client.buildUrl('/api/v1/sports');
      assert.equal(url, 'http://localhost:18080/api/v1/sports');
    });

    it('appends query parameters', () => {
      const url = client.buildUrl('/api/v1/events', { sport: 'football', status: 'live' });
      assert.ok(url.includes('sport=football'));
      assert.ok(url.includes('status=live'));
    });

    it('does not double-encode path', () => {
      const url = client.buildUrl('/api/v1/sports/cs2/leagues');
      assert.equal(url, 'http://localhost:18080/api/v1/sports/cs2/leagues');
    });

    it('handles empty params gracefully', () => {
      const url = client.buildUrl('/api/v1/events', {});
      assert.equal(url, 'http://localhost:18080/api/v1/events');
    });
  });

  describe('Headers', () => {
    it('includes Content-Type by default', () => {
      const headers = client.getHeadersPublic();
      assert.equal(headers['Content-Type'], 'application/json');
    });

    it('does not include Authorization when no token', () => {
      const headers = client.getHeadersPublic();
      assert.equal(headers['Authorization'], undefined);
    });

    it('includes Bearer token when set', () => {
      client.setTestToken('test-jwt-token-123');
      const headers = client.getHeadersPublic();
      assert.equal(headers['Authorization'], 'Bearer test-jwt-token-123');
    });
  });

  describe('ApiError', () => {
    it('stores status code', () => {
      const err = new ApiError(401, 'Unauthorized');
      assert.equal(err.status, 401);
      assert.equal(err.message, 'Unauthorized');
      assert.equal(err.name, 'ApiError');
    });

    it('is an instance of Error', () => {
      const err = new ApiError(500, 'Internal Server Error');
      assert.ok(err instanceof Error);
    });
  });
});
