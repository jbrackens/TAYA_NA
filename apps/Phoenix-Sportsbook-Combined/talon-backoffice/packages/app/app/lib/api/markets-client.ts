import { apiClient } from './client';

// Request types
export interface GetMarketsParams {
  fixture_id: string;
}

// Response types (Go API uses snake_case)
interface MarketSelectionRaw {
  selection_id: string;
  selection_name: string;
  odds: number;
  specifier?: string;
}

interface MarketRaw {
  market_id: string;
  fixture_id: string;
  market_name: string;
  market_key: string;
  status: string;
  selections: MarketSelectionRaw[];
  specifiers?: Record<string, string>;
  in_play: boolean;
  bet_count?: number;
  volume?: number;
}

// Normalized response types (camelCase)
export interface MarketSelection {
  selectionId: string;
  selectionName: string;
  odds: number;
  specifier?: string;
}

export interface Market {
  marketId: string;
  fixtureId: string;
  marketName: string;
  marketKey: string;
  status: string;
  selections: MarketSelection[];
  specifiers?: Record<string, string>;
  inPlay: boolean;
  betCount?: number;
  volume?: number;
}

// Utility function to normalize snake_case to camelCase
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

/**
 * Get all markets for a fixture
 */
export async function getMarkets(fixtureId: string): Promise<Market[]> {
  const raw = await apiClient.get<MarketRaw[]>('/api/v1/markets', { fixture_id: fixtureId });
  return normalizeSnakeCase(raw);
}

/**
 * Get a specific market by ID
 */
export async function getMarket(marketId: string): Promise<Market> {
  const raw = await apiClient.get<MarketRaw>(`/api/v1/markets/${marketId}`);
  return normalizeSnakeCase(raw);
}
