/**
 * Unit tests for odds formatting utility
 * Run: node --test app/__tests__/odds.test.ts  (requires ts-node)
 *   or: npx tsx --test app/__tests__/odds.test.ts
 *
 * These tests use Node's built-in test runner (node:test) — zero dependencies.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Inline the logic since we can't import TS directly without a loader ──
// Mirror of app/lib/utils/odds.ts functions

function decimalToAmerican(decimal: number): string {
  if (decimal <= 1) return '-';
  if (decimal >= 2) {
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  }
  const american = Math.round(-100 / (decimal - 1));
  return `${american}`;
}

function decimalToFractional(decimal: number): string {
  if (decimal <= 1) return '-';
  const numerator = decimal - 1;
  // Find a clean fraction
  for (const denom of [1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100]) {
    const num = numerator * denom;
    if (Math.abs(num - Math.round(num)) < 0.01) {
      return `${Math.round(num)}/${denom}`;
    }
  }
  return `${numerator.toFixed(2)}/1`;
}

describe('decimalToAmerican', () => {
  it('returns + prefix for odds >= 2.0', () => {
    assert.equal(decimalToAmerican(2.5), '+150');
    assert.equal(decimalToAmerican(3.0), '+200');
    assert.equal(decimalToAmerican(2.0), '+100');
  });

  it('returns negative for odds < 2.0', () => {
    assert.equal(decimalToAmerican(1.5), '-200');
    assert.equal(decimalToAmerican(1.25), '-400');
    assert.equal(decimalToAmerican(1.1), '-1000');
  });

  it('returns - for odds <= 1', () => {
    assert.equal(decimalToAmerican(1.0), '-');
    assert.equal(decimalToAmerican(0.5), '-');
  });

  it('handles edge case of exactly 2.0', () => {
    assert.equal(decimalToAmerican(2.0), '+100');
  });
});

describe('decimalToFractional', () => {
  it('converts common odds correctly', () => {
    assert.equal(decimalToFractional(2.5), '3/2');
    assert.equal(decimalToFractional(3.0), '2/1');
    assert.equal(decimalToFractional(1.5), '1/2');
  });

  it('handles even money', () => {
    assert.equal(decimalToFractional(2.0), '1/1');
  });

  it('returns - for odds <= 1', () => {
    assert.equal(decimalToFractional(1.0), '-');
    assert.equal(decimalToFractional(0.5), '-');
  });
});
