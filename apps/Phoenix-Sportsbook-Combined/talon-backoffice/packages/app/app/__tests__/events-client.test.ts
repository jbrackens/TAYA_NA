/**
 * Unit tests for events-client normalizeSnakeCase + type contracts
 *
 * Run: npx tsx --test app/__tests__/events-client.test.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Mirror normalizeSnakeCase from events-client.ts ──
function normalizeSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      acc[camelKey] = typeof value === 'object' && value !== null
        ? normalizeSnakeCase(value as Record<string, unknown>)
        : value;
      return acc;
    }, {});
  }
  return obj;
}

describe('normalizeSnakeCase', () => {
  it('converts snake_case keys to camelCase', () => {
    const input = { sport_id: '1', sport_name: 'Football', event_count: 42 };
    const result = normalizeSnakeCase(input);
    assert.equal(result.sportId, '1');
    assert.equal(result.sportName, 'Football');
    assert.equal(result.eventCount, 42);
  });

  it('handles nested objects', () => {
    const input = { league_info: { league_name: 'EPL', sport_key: 'football' } };
    const result = normalizeSnakeCase(input);
    const nested = result.leagueInfo as Record<string, unknown>;
    assert.equal(nested.leagueName, 'EPL');
    assert.equal(nested.sportKey, 'football');
  });

  it('handles arrays of objects', () => {
    const input = [
      { sport_id: '1', sport_name: 'Football' },
      { sport_id: '2', sport_name: 'Basketball' },
    ];
    const result = normalizeSnakeCase(input as unknown as Record<string, unknown>);
    const arr = result as unknown as Array<Record<string, unknown>>;
    assert.equal(arr[0].sportName, 'Football');
    assert.equal(arr[1].sportName, 'Basketball');
  });

  it('preserves already-camelCase keys', () => {
    const input = { sportId: '1', sportName: 'Football' };
    const result = normalizeSnakeCase(input);
    assert.equal(result.sportId, '1');
    assert.equal(result.sportName, 'Football');
  });

  it('handles primitive values', () => {
    const input = { status: 'live', count: 5, active: true };
    const result = normalizeSnakeCase(input);
    assert.equal(result.status, 'live');
    assert.equal(result.count, 5);
    assert.equal(result.active, true);
  });

  it('handles null values in objects', () => {
    const input = { home_team: 'Team A', away_team: null };
    const result = normalizeSnakeCase(input as unknown as Record<string, unknown>);
    assert.equal(result.homeTeam, 'Team A');
    assert.equal(result.awayTeam, null);
  });

  it('handles empty objects', () => {
    const result = normalizeSnakeCase({});
    assert.deepEqual(result, {});
  });

  it('handles deep nesting', () => {
    const input = {
      event_data: {
        fixture_info: {
          home_team: 'A',
          away_team: 'B',
        },
      },
    };
    const result = normalizeSnakeCase(input);
    const data = result.eventData as Record<string, unknown>;
    const info = data.fixtureInfo as Record<string, unknown>;
    assert.equal(info.homeTeam, 'A');
    assert.equal(info.awayTeam, 'B');
  });
});

describe('Event type contract', () => {
  it('normalizes raw API response to Event shape', () => {
    const rawEvent = {
      event_id: 'evt-001',
      fixture_id: 'fix-001',
      sport_id: 'spt-001',
      league_id: 'lg-001',
      home_team: 'Team Alpha',
      away_team: 'Team Beta',
      sport_key: 'football',
      league_key: 'epl',
      start_time: '2026-04-04T15:00:00Z',
      status: 'in_play',
      has_markets: true,
    };
    const event = normalizeSnakeCase(rawEvent);

    assert.equal(event.eventId, 'evt-001');
    assert.equal(event.fixtureId, 'fix-001');
    assert.equal(event.homeTeam, 'Team Alpha');
    assert.equal(event.awayTeam, 'Team Beta');
    assert.equal(event.sportKey, 'football');
    assert.equal(event.leagueKey, 'epl');
    assert.equal(event.status, 'in_play');
    assert.equal(event.hasMarkets, true);
  });

  it('normalizes raw Sport response', () => {
    const raw = { sport_id: 's1', sport_name: 'CS2', sport_key: 'cs2', event_count: 15 };
    const sport = normalizeSnakeCase(raw);
    assert.equal(sport.sportId, 's1');
    assert.equal(sport.sportName, 'CS2');
    assert.equal(sport.sportKey, 'cs2');
    assert.equal(sport.eventCount, 15);
  });

  it('normalizes raw League response', () => {
    const raw = { league_id: 'l1', league_name: 'EPL', league_key: 'epl', sport_key: 'football', event_count: 38 };
    const league = normalizeSnakeCase(raw);
    assert.equal(league.leagueId, 'l1');
    assert.equal(league.leagueName, 'EPL');
    assert.equal(league.leagueKey, 'epl');
    assert.equal(league.eventCount, 38);
  });
});
