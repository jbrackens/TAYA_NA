/**
 * Unit tests for WebSocket message handler logic
 *
 * Run: npx tsx --test app/__tests__/websocket-handlers.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Types mirroring the WS handler contracts ──
interface WsMessage {
  channel: string;
  event: string;
  data: Record<string, unknown>;
}

interface OddsUpdate {
  selectionId: string;
  marketId: string;
  oldOdds: number;
  newOdds: number;
  direction: 'up' | 'down' | 'same';
}

// ── Handler logic extracted for testability ──

function parseOddsDirection(oldOdds: number, newOdds: number): 'up' | 'down' | 'same' {
  if (newOdds > oldOdds) return 'up';
  if (newOdds < oldOdds) return 'down';
  return 'same';
}

function parseFixtureStatus(raw: string): string {
  const statusMap: Record<string, string> = {
    'in_play': 'live',
    'pre_match': 'upcoming',
    'finished': 'finished',
    'cancelled': 'cancelled',
    'postponed': 'postponed',
  };
  return statusMap[raw] || raw;
}

function isValidWsMessage(msg: unknown): msg is WsMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const obj = msg as Record<string, unknown>;
  return typeof obj.channel === 'string' && typeof obj.event === 'string';
}

function extractBetUpdate(data: Record<string, unknown>) {
  return {
    selectionId: (data.selection_id as string) || (data.selectionId as string) || '',
    brandMarketId: (data.brand_market_id as string) || (data.brandMarketId as string) || '',
    status: (data.status as string) || 'pending',
    odds: (data.odds as number) || 0,
  };
}

describe('parseOddsDirection', () => {
  it('detects upward movement', () => {
    assert.equal(parseOddsDirection(1.5, 2.0), 'up');
  });

  it('detects downward movement', () => {
    assert.equal(parseOddsDirection(2.0, 1.5), 'down');
  });

  it('detects no change', () => {
    assert.equal(parseOddsDirection(1.5, 1.5), 'same');
  });

  it('handles tiny differences', () => {
    assert.equal(parseOddsDirection(1.500, 1.501), 'up');
    assert.equal(parseOddsDirection(1.501, 1.500), 'down');
  });
});

describe('parseFixtureStatus', () => {
  it('maps in_play to live', () => {
    assert.equal(parseFixtureStatus('in_play'), 'live');
  });

  it('maps pre_match to upcoming', () => {
    assert.equal(parseFixtureStatus('pre_match'), 'upcoming');
  });

  it('maps finished to finished', () => {
    assert.equal(parseFixtureStatus('finished'), 'finished');
  });

  it('passes through unknown statuses', () => {
    assert.equal(parseFixtureStatus('suspended'), 'suspended');
  });
});

describe('isValidWsMessage', () => {
  it('validates correct messages', () => {
    assert.ok(isValidWsMessage({ channel: 'fixtures', event: 'update', data: {} }));
  });

  it('rejects null', () => {
    assert.equal(isValidWsMessage(null), false);
  });

  it('rejects non-objects', () => {
    assert.equal(isValidWsMessage('string'), false);
    assert.equal(isValidWsMessage(42), false);
  });

  it('rejects missing channel', () => {
    assert.equal(isValidWsMessage({ event: 'update', data: {} }), false);
  });

  it('rejects missing event', () => {
    assert.equal(isValidWsMessage({ channel: 'fixtures', data: {} }), false);
  });
});

describe('extractBetUpdate', () => {
  it('extracts from snake_case fields', () => {
    const data = { selection_id: 'sel-1', brand_market_id: 'bm-1', status: 'settled', odds: 2.5 };
    const result = extractBetUpdate(data);
    assert.equal(result.selectionId, 'sel-1');
    assert.equal(result.brandMarketId, 'bm-1');
    assert.equal(result.status, 'settled');
    assert.equal(result.odds, 2.5);
  });

  it('extracts from camelCase fields', () => {
    const data = { selectionId: 'sel-2', brandMarketId: 'bm-2', status: 'won', odds: 1.8 };
    const result = extractBetUpdate(data);
    assert.equal(result.selectionId, 'sel-2');
    assert.equal(result.brandMarketId, 'bm-2');
  });

  it('provides defaults for missing fields', () => {
    const data = {};
    const result = extractBetUpdate(data);
    assert.equal(result.selectionId, '');
    assert.equal(result.brandMarketId, '');
    assert.equal(result.status, 'pending');
    assert.equal(result.odds, 0);
  });
});
