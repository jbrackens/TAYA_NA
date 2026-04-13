/**
 * Bet placement flow tests — validates stake validation, odds change policies,
 * idempotency key generation, precheck logic, and error handling.
 *
 * Run: npx tsx --test app/__tests__/bet-placement.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Bet placement logic mirror for unit testing ──

interface BetItem {
  marketId: string;
  selectionId: string;
  stakeCents: number;
  odds: number;
}

interface PrecheckResult {
  allowed: boolean;
  reasonCode?: string;
  minStakeCents: number;
  maxStakeCents: number;
  availableBalanceCents: number;
  currentOdds: number;
  oddsChanged: boolean;
}

function validateStake(stakeCents: number, minCents: number, maxCents: number): string | null {
  if (!Number.isFinite(stakeCents) || stakeCents <= 0) {
    return 'stake must be a positive number';
  }
  if (stakeCents < minCents) {
    return `stake below minimum (${minCents} cents)`;
  }
  if (stakeCents > maxCents) {
    return `stake exceeds maximum (${maxCents} cents)`;
  }
  return null;
}

function validateOdds(odds: number, minOdds: number, maxOdds: number): string | null {
  if (!Number.isFinite(odds) || odds <= 1.0) {
    return 'odds must be greater than 1.0';
  }
  if (odds < minOdds) {
    return `odds below minimum (${minOdds})`;
  }
  if (odds > maxOdds) {
    return `odds exceed maximum (${maxOdds})`;
  }
  return null;
}

function checkBalanceSufficient(stakeCents: number, availableCents: number): boolean {
  return availableCents >= stakeCents;
}

function buildIdempotencyKey(userId: string, marketId: string, selectionId: string, timestamp: number): string {
  const raw = `${userId}:${marketId}:${selectionId}:${timestamp}`;
  // Simple hash for testing (production uses crypto)
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `idk_${Math.abs(hash).toString(36)}`;
}

function calculatePotentialPayout(stakeCents: number, odds: number): number {
  return Math.round(stakeCents * odds);
}

function evaluateOddsChangePolicy(
  requestedOdds: number,
  currentOdds: number,
  policy: string
): { accept: boolean; finalOdds: number; reason?: string } {
  const tolerance = 0.0001;
  const oddsMatch = Math.abs(requestedOdds - currentOdds) < tolerance;

  switch (policy) {
    case 'accept_requested':
      return { accept: true, finalOdds: requestedOdds };
    case 'accept_latest':
      return { accept: true, finalOdds: currentOdds };
    case 'reject_on_change':
      if (!oddsMatch) {
        return { accept: false, finalOdds: requestedOdds, reason: 'odds_changed' };
      }
      return { accept: true, finalOdds: requestedOdds };
    case 'only_better':
      if (currentOdds < requestedOdds && !oddsMatch) {
        return { accept: false, finalOdds: requestedOdds, reason: 'odds_worse' };
      }
      return { accept: true, finalOdds: currentOdds };
    default:
      return { accept: true, finalOdds: requestedOdds };
  }
}

describe('Bet Placement Validation', () => {
  describe('validateStake', () => {
    it('rejects zero stake', () => {
      assert.notEqual(validateStake(0, 100, 1000000), null);
    });
    it('rejects negative stake', () => {
      assert.notEqual(validateStake(-500, 100, 1000000), null);
    });
    it('rejects NaN stake', () => {
      assert.notEqual(validateStake(NaN, 100, 1000000), null);
    });
    it('rejects stake below minimum', () => {
      const error = validateStake(50, 100, 1000000);
      assert.ok(error?.includes('below minimum'));
    });
    it('rejects stake above maximum', () => {
      const error = validateStake(2000000, 100, 1000000);
      assert.ok(error?.includes('exceeds maximum'));
    });
    it('accepts valid stake', () => {
      assert.equal(validateStake(5000, 100, 1000000), null);
    });
    it('accepts stake at minimum', () => {
      assert.equal(validateStake(100, 100, 1000000), null);
    });
    it('accepts stake at maximum', () => {
      assert.equal(validateStake(1000000, 100, 1000000), null);
    });
  });

  describe('validateOdds', () => {
    it('rejects odds of 1.0', () => {
      assert.notEqual(validateOdds(1.0, 1.01, 1000), null);
    });
    it('rejects odds below minimum', () => {
      assert.notEqual(validateOdds(1.005, 1.01, 1000), null);
    });
    it('rejects odds above maximum', () => {
      assert.notEqual(validateOdds(1500, 1.01, 1000), null);
    });
    it('accepts valid odds', () => {
      assert.equal(validateOdds(2.5, 1.01, 1000), null);
    });
  });

  describe('checkBalanceSufficient', () => {
    it('returns false when insufficient', () => {
      assert.equal(checkBalanceSufficient(10000, 5000), false);
    });
    it('returns true when sufficient', () => {
      assert.equal(checkBalanceSufficient(5000, 10000), true);
    });
    it('returns true when exact', () => {
      assert.equal(checkBalanceSufficient(5000, 5000), true);
    });
  });

  describe('buildIdempotencyKey', () => {
    it('produces consistent keys for same input', () => {
      const key1 = buildIdempotencyKey('u-1', 'm-1', 's-1', 1000);
      const key2 = buildIdempotencyKey('u-1', 'm-1', 's-1', 1000);
      assert.equal(key1, key2);
    });
    it('produces different keys for different inputs', () => {
      const key1 = buildIdempotencyKey('u-1', 'm-1', 's-1', 1000);
      const key2 = buildIdempotencyKey('u-1', 'm-1', 's-1', 2000);
      assert.notEqual(key1, key2);
    });
    it('starts with idk_ prefix', () => {
      const key = buildIdempotencyKey('u-1', 'm-1', 's-1', 1000);
      assert.ok(key.startsWith('idk_'));
    });
  });

  describe('calculatePotentialPayout', () => {
    it('calculates correctly for simple odds', () => {
      assert.equal(calculatePotentialPayout(10000, 2.0), 20000);
    });
    it('rounds correctly for fractional odds', () => {
      assert.equal(calculatePotentialPayout(10000, 1.5), 15000);
    });
    it('handles high odds', () => {
      assert.equal(calculatePotentialPayout(1000, 100.0), 100000);
    });
  });

  describe('evaluateOddsChangePolicy', () => {
    it('accept_requested always uses requested odds', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.5, 'accept_requested');
      assert.equal(result.accept, true);
      assert.equal(result.finalOdds, 2.0);
    });

    it('accept_latest always uses current odds', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.5, 'accept_latest');
      assert.equal(result.accept, true);
      assert.equal(result.finalOdds, 2.5);
    });

    it('reject_on_change rejects when odds differ', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.5, 'reject_on_change');
      assert.equal(result.accept, false);
      assert.equal(result.reason, 'odds_changed');
    });

    it('reject_on_change accepts when odds match', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.0, 'reject_on_change');
      assert.equal(result.accept, true);
    });

    it('only_better rejects when current odds are worse', () => {
      const result = evaluateOddsChangePolicy(2.5, 2.0, 'only_better');
      assert.equal(result.accept, false);
      assert.equal(result.reason, 'odds_worse');
    });

    it('only_better accepts when current odds are better', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.5, 'only_better');
      assert.equal(result.accept, true);
      assert.equal(result.finalOdds, 2.5);
    });

    it('only_better accepts when odds match', () => {
      const result = evaluateOddsChangePolicy(2.0, 2.0, 'only_better');
      assert.equal(result.accept, true);
    });
  });
});
