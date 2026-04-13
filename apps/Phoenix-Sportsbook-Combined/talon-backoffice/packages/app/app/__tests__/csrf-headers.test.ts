/**
 * Regression test: CSRF token header inclusion in API client
 * Verifies that POST/PUT/DELETE methods include CSRF header,
 * and GET does not.
 *
 * Run: npx tsx --test app/__tests__/csrf-headers.test.ts
 *
 * Regression: CSRF protection added in 2026-04-12 session
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const clientPath = resolve(__dirname, '../lib/api/client.ts');
const source = readFileSync(clientPath, 'utf-8');

describe('API client CSRF header handling', () => {
  it('getHeaders method accepts includeCsrf parameter', () => {
    assert.ok(
      source.includes('includeCsrf'),
      'getHeaders should have includeCsrf parameter',
    );
  });

  it('reads csrf_token cookie', () => {
    assert.ok(
      source.includes("csrf_token"),
      'should read csrf_token cookie',
    );
  });

  it('sets X-CSRF-Token header', () => {
    assert.ok(
      source.includes('X-CSRF-Token'),
      'should set X-CSRF-Token header',
    );
  });

  it('POST method passes includeCsrf=true', () => {
    const postSection = source.substring(
      source.indexOf('async post<T>'),
      source.indexOf('async put<T>'),
    );
    assert.ok(
      postSection.includes('getHeaders(true)'),
      'POST should call getHeaders(true) to include CSRF',
    );
  });

  it('PUT method passes includeCsrf=true', () => {
    const putSection = source.substring(
      source.indexOf('async put<T>'),
      source.indexOf('async delete<T>'),
    );
    assert.ok(
      putSection.includes('getHeaders(true)'),
      'PUT should call getHeaders(true) to include CSRF',
    );
  });

  it('DELETE method passes includeCsrf=true', () => {
    const deleteSection = source.substring(
      source.indexOf('async delete<T>'),
    );
    assert.ok(
      deleteSection.includes('getHeaders(true)'),
      'DELETE should call getHeaders(true) to include CSRF',
    );
  });

  it('GET method does NOT pass includeCsrf', () => {
    const getSection = source.substring(
      source.indexOf('async get<T>'),
      source.indexOf('async post<T>'),
    );
    assert.ok(
      getSection.includes('getHeaders()'),
      'GET should call getHeaders() without CSRF flag',
    );
  });
});
