/**
 * Regression test: compliance-client.ts endpoint paths
 * Verifies all compliance functions call the correct Go backend paths
 * after the path alignment fix (was /punters/*, now /compliance/rg/*).
 *
 * Run: npx tsx --test app/__tests__/compliance-paths.test.ts
 *
 * Regression: ISSUE-001 — compliance paths mismatched with Go backend
 * Found during production readiness audit on 2026-04-13
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const clientPath = resolve(__dirname, '../lib/api/compliance-client.ts');
const source = readFileSync(clientPath, 'utf-8');

describe('compliance-client endpoint paths', () => {
  it('setDepositLimits calls /compliance/rg/deposit-limit', () => {
    assert.ok(
      source.includes('/api/v1/compliance/rg/deposit-limit'),
      'setDepositLimits should call /api/v1/compliance/rg/deposit-limit',
    );
    assert.ok(
      !source.includes('/api/v1/punters/deposit-limits'),
      'should NOT reference old /punters/deposit-limits path',
    );
  });

  it('setStakeLimits calls /compliance/rg/bet-limit', () => {
    assert.ok(
      source.includes('/api/v1/compliance/rg/bet-limit'),
      'setStakeLimits should call /api/v1/compliance/rg/bet-limit',
    );
    assert.ok(
      !source.includes('/api/v1/punters/stake-limits'),
      'should NOT reference old /punters/stake-limits path',
    );
  });

  it('coolOff calls /compliance/rg/cool-off', () => {
    const coolOffMatches = source.match(/\/api\/v1\/compliance\/rg\/cool-off/g);
    assert.ok(
      coolOffMatches && coolOffMatches.length >= 2,
      'coolOff and setSessionLimits should both call /compliance/rg/cool-off',
    );
  });

  it('selfExclude calls /compliance/rg/self-exclude', () => {
    assert.ok(
      source.includes('/api/v1/compliance/rg/self-exclude'),
      'selfExclude should call /api/v1/compliance/rg/self-exclude',
    );
  });

  it('uploadKycDocument calls /compliance/kyc/submit-document', () => {
    assert.ok(
      source.includes('/api/v1/compliance/kyc/submit-document'),
      'uploadKycDocument should call /api/v1/compliance/kyc/submit-document',
    );
    assert.ok(
      !source.includes('/api/v1/compliance/documents/upload'),
      'should NOT reference old /compliance/documents/upload path',
    );
  });

  it('getCoolOffStatus calls /compliance/rg/restrictions (already correct)', () => {
    assert.ok(
      source.includes('/api/v1/compliance/rg/restrictions'),
      'getCoolOffStatus should call /api/v1/compliance/rg/restrictions',
    );
  });

  it('getLimitsHistory composes from deposit-limits + bet-limits', () => {
    assert.ok(
      source.includes('/api/v1/compliance/rg/deposit-limits'),
      'getLimitsHistory should fetch deposit-limits',
    );
    assert.ok(
      source.includes('/api/v1/compliance/rg/bet-limits'),
      'getLimitsHistory should fetch bet-limits',
    );
    assert.ok(
      !source.includes('/api/v1/punters/limits-history'),
      'should NOT reference old /punters/limits-history path',
    );
  });

  it('no remaining /punters/ paths in compliance client', () => {
    const punterPaths = source.match(/\/api\/v1\/punters\//g);
    assert.equal(
      punterPaths,
      null,
      'compliance-client should have zero /api/v1/punters/ references',
    );
  });
});
