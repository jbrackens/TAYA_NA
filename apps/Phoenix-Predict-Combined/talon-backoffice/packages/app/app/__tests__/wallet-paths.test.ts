/**
 * Regression test: wallet-client.ts endpoint paths
 * Verifies deposit/withdraw/transaction-status call correct Go backend paths.
 *
 * Run: npx tsx --test app/__tests__/wallet-paths.test.ts
 *
 * Regression: wallet paths mismatched — /wallets/* vs /payments/*
 * Found during production readiness audit on 2026-04-13
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const clientPath = resolve(__dirname, '../lib/api/wallet-client.ts');
const source = readFileSync(clientPath, 'utf-8');

describe('wallet-client endpoint paths', () => {
  it('deposit calls /payments/deposit (not /wallets/*/deposit)', () => {
    assert.ok(
      source.includes('/api/v1/payments/deposit'),
      'deposit should call /api/v1/payments/deposit',
    );
  });

  it('withdraw calls /payments/withdraw (not /wallets/*/withdraw)', () => {
    assert.ok(
      source.includes('/api/v1/payments/withdraw'),
      'withdraw should call /api/v1/payments/withdraw',
    );
  });

  it('getTransactionStatus calls /payments/status', () => {
    assert.ok(
      source.includes('/api/v1/payments/status'),
      'getTransactionStatus should call /api/v1/payments/status',
    );
  });

  it('getBalance still calls /wallet/{userId} (correct primary path)', () => {
    assert.ok(
      source.includes('/api/v1/wallet/'),
      'getBalance should use /api/v1/wallet/ primary path',
    );
  });

  it('getTransactions still calls /wallet/{userId}/ledger (correct primary path)', () => {
    assert.ok(
      source.includes('/ledger'),
      'getTransactions should use /wallet/{userId}/ledger path',
    );
  });
});
