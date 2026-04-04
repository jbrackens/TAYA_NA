/** Go phoenix-market-engine service response types. */

/** GET /api/v1/markets response (paginated). */
export interface GoMarketsResponse {
  markets: GoMarket[];
  total: number;
  page: number;
  limit: number;
}

/** GET /api/v1/markets/{market_id} response. */
export interface GoMarket {
  market_id: string;
  event_id: string;
  market_type: string;
  outcomes: GoOutcome[];
  odds: Record<string, number>;
  status: string;
  min_bet: number;
  max_bet: number;
  created_at: string;
  updated_at: string;
}

export interface GoOutcome {
  name: string;
  outcome_id: string;
}

/** Query parameters for GET /api/v1/markets. */
export interface GoMarketsQuery {
  event_id?: string;
  status?: string;
  market_type?: string;
  page?: number;
  limit?: number;
}
