/**
 * Regression test: betting-client.ts cashout endpoint paths
 * Verifies cashout functions call correct Go backend paths.
 *
 * Run: npx tsx --test app/__tests__/cashout-paths.test.ts
 *
 * Regression: cashout paths mismatched — /{betId}/cashout-offer vs /cashout/quote
 * Found during production readiness audit on 2026-04-13
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const clientPath = resolve(__dirname, '../lib/api/betting-client.ts');
const source = readFileSync(clientPath, 'utf-8');

describe('betting-client cashout paths', () => {
  it('getCashoutOffer calls POST /bets/cashout/quote', () => {
    assert.ok(
      source.includes('/api/v1/bets/cashout/quote'),
      'getCashoutOffer should call /api/v1/bets/cashout/quote',
    );
  });

  it('cashoutBet calls POST /bets/cashout/accept', () => {
    assert.ok(
      source.includes('/api/v1/bets/cashout/accept'),
      'cashoutBet should call /api/v1/bets/cashout/accept',
    );
  });

  it('no old /{betId}/cashout-offer paths remain', () => {
    assert.ok(
      !source.includes('/cashout-offer'),
      'should NOT reference old /cashout-offer path pattern',
    );
  });
});
