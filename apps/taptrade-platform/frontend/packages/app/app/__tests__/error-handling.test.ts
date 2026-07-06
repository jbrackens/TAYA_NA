/**
 * Error handling tests — validates error classification, API error parsing,
 * timeout detection, network error handling, and retry eligibility.
 *
 * Run: npx tsx --test app/__tests__/error-handling.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Error handling logic mirror for unit testing ──

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

function parseApiError(status: number, body: string): { code: string; message: string; retryable: boolean } {
  try {
    const parsed = JSON.parse(body) as ApiErrorResponse;
    if (parsed.error?.code && parsed.error?.message) {
      return {
        code: parsed.error.code,
        message: parsed.error.message,
        retryable: isRetryableError(status, parsed.error.code),
      };
    }
  } catch {
    // Not JSON — fallback
  }
  return {
    code: `http_${status}`,
    message: body || `HTTP ${status}`,
    retryable: isRetryableStatus(status),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(status: number, code: string): boolean {
  if (isRetryableStatus(status)) return true;
  // Serialization conflicts are retryable
  if (code === 'conflict' && status === 409) return true;
  return false;
}

function classifyNetworkError(err: unknown): { type: string; retryable: boolean; message: string } {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
      return { type: 'timeout', retryable: true, message: 'Request timed out' };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
      return { type: 'network', retryable: true, message: 'Network error — server may be unavailable' };
    }
    if (msg.includes('cors') || msg.includes('origin')) {
      return { type: 'cors', retryable: false, message: 'Cross-origin request blocked' };
    }
    return { type: 'unknown', retryable: false, message: err.message };
  }
  return { type: 'unknown', retryable: false, message: String(err) };
}

function shouldRetry(attempt: number, maxAttempts: number, retryable: boolean): boolean {
  if (!retryable) return false;
  return attempt < maxAttempts;
}

function calculateBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  // Add jitter (0-25% of delay)
  const jitter = delay * 0.25 * Math.random();
  return Math.round(delay + jitter);
}

describe('Error Handling', () => {
  describe('parseApiError', () => {
    it('parses structured API error', () => {
      const body = JSON.stringify({
        error: { code: 'bad_request', message: 'invalid stake amount', requestId: 'req-123' }
      });
      const result = parseApiError(400, body);
      assert.equal(result.code, 'bad_request');
      assert.equal(result.message, 'invalid stake amount');
      assert.equal(result.retryable, false);
    });

    it('handles non-JSON body', () => {
      const result = parseApiError(500, 'Internal Server Error');
      assert.equal(result.code, 'http_500');
      assert.equal(result.retryable, false);
    });

    it('handles empty body', () => {
      const result = parseApiError(502, '');
      assert.equal(result.code, 'http_502');
      assert.equal(result.retryable, true);
    });

    it('marks 429 as retryable', () => {
      const body = JSON.stringify({ error: { code: 'rate_limited', message: 'too many requests' } });
      const result = parseApiError(429, body);
      assert.equal(result.retryable, true);
    });

    it('marks 503 as retryable', () => {
      const result = parseApiError(503, 'Service Unavailable');
      assert.equal(result.retryable, true);
    });

    it('marks 409 conflict as retryable', () => {
      const body = JSON.stringify({ error: { code: 'conflict', message: 'serialization failure' } });
      const result = parseApiError(409, body);
      assert.equal(result.retryable, true);
    });

    it('marks 401 as not retryable', () => {
      const body = JSON.stringify({ error: { code: 'unauthorized', message: 'invalid token' } });
      const result = parseApiError(401, body);
      assert.equal(result.retryable, false);
    });

    it('marks 403 as not retryable', () => {
      const body = JSON.stringify({ error: { code: 'forbidden', message: 'admin required' } });
      const result = parseApiError(403, body);
      assert.equal(result.retryable, false);
    });
  });

  describe('classifyNetworkError', () => {
    it('classifies timeout errors', () => {
      const result = classifyNetworkError(new Error('Request timed out'));
      assert.equal(result.type, 'timeout');
      assert.equal(result.retryable, true);
    });

    it('classifies abort errors as timeout', () => {
      const result = classifyNetworkError(new Error('The operation was aborted'));
      assert.equal(result.type, 'timeout');
      assert.equal(result.retryable, true);
    });

    it('classifies network errors', () => {
      const result = classifyNetworkError(new Error('Failed to fetch'));
      assert.equal(result.type, 'network');
      assert.equal(result.retryable, true);
    });

    it('classifies connection refused', () => {
      const result = classifyNetworkError(new Error('ECONNREFUSED'));
      assert.equal(result.type, 'network');
      assert.equal(result.retryable, true);
    });

    it('classifies CORS errors as non-retryable', () => {
      const result = classifyNetworkError(new Error('CORS policy blocked'));
      assert.equal(result.type, 'cors');
      assert.equal(result.retryable, false);
    });

    it('handles non-Error objects', () => {
      const result = classifyNetworkError('some string error');
      assert.equal(result.type, 'unknown');
      assert.equal(result.retryable, false);
    });
  });

  describe('shouldRetry', () => {
    it('retries when retryable and under max', () => {
      assert.equal(shouldRetry(1, 3, true), true);
    });
    it('stops at max attempts', () => {
      assert.equal(shouldRetry(3, 3, true), false);
    });
    it('does not retry non-retryable errors', () => {
      assert.equal(shouldRetry(1, 3, false), false);
    });
  });

  describe('calculateBackoff', () => {
    it('increases exponentially', () => {
      const delay0 = calculateBackoff(0, 100, 10000);
      const delay1 = calculateBackoff(1, 100, 10000);
      const delay2 = calculateBackoff(2, 100, 10000);
      // With jitter, delay1 should be roughly 2x delay0
      assert.ok(delay1 > delay0, `delay1 (${delay1}) should be > delay0 (${delay0})`);
      assert.ok(delay2 > delay1, `delay2 (${delay2}) should be > delay1 (${delay1})`);
    });

    it('caps at maxMs', () => {
      const delay = calculateBackoff(20, 100, 5000);
      assert.ok(delay <= 6250, `delay (${delay}) should be <= 6250 (5000 + 25% jitter)`);
    });

    it('returns positive values', () => {
      for (let i = 0; i < 10; i++) {
        assert.ok(calculateBackoff(i, 100, 10000) > 0);
      }
    });
  });
});
