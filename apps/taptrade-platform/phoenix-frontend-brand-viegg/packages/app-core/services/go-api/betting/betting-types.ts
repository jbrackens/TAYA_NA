// ── Go Betting API Types ──

/** POST /api/v1/bets — single bet placement */
export interface GoPlaceBetRequest {
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
  odds: number;
  accept_better_odds?: boolean;
  freebet_id?: string;
  odds_boost_id?: string;
}

export interface GoPlaceBetResponse {
  bet_id: string;
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
  odds: number;
  status: string;
  potential_payout: number;
  created_at: string;
}

/** POST /api/v1/parlays — multi-leg bet placement */
export interface GoParlayLeg {
  market_id: string;
  outcome_id: string;
  odds: number;
}

export interface GoPlaceParlayRequest {
  user_id: string;
  stake: number;
  legs: GoParlayLeg[];
  accept_better_odds?: boolean;
}

export interface GoPlaceParlayResponse {
  parlay_id: string;
  user_id: string;
  legs: GoParlayLeg[];
  combined_odds: number;
  stake: number;
  potential_payout: number;
  status: string;
  created_at: string;
}

/** GET /api/v1/users/{user_id}/bets — user's bets */
export interface GoUserBetsQuery {
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface GoUserBetsResponse {
  bets: GoBet[];
  total: number;
  page: number;
  limit: number;
}

export interface GoBet {
  bet_id: string;
  user_id: string;
  market_id: string;
  outcome_id: string;
  stake: number;
  odds: number;
  status: string;
  potential_payout: number;
  payout?: number;
  outcome?: string;
  settled_at?: string;
  created_at: string;
  updated_at: string;
  // Enriched fields (may come from joined data)
  event_id?: string;
  sport?: string;
  league?: string;
  home_team?: string;
  away_team?: string;
  market_type?: string;
  outcome_name?: string;
}

/** GET /api/v1/bets/{bet_id} — single bet lookup */
export type GoBetDetail = GoBet;

/** POST /api/v1/bets/{bet_id}/cashout */
export interface GoCashoutRequest {
  user_id: string;
}

export interface GoCashoutResponse {
  bet_id: string;
  cashout_amount: number;
  status: string;
}

/** GET /api/v1/bets/{bet_id}/cashout-offer */
export interface GoCashoutOffer {
  bet_id: string;
  cashout_amount: number;
  expires_at: string;
}

/** POST /api/v1/bets/precheck */
export type GoPrecheckRequest = {
  bets: Array<{
    market_id: string;
    outcome_id: string;
    stake: number;
    odds: number;
  }>;
};

export type GoPrecheckResponse = {
  results: Array<{
    market_id: string;
    outcome_id: string;
    should_block_placement: boolean;
    error_code?: string;
  }>;
};

/** POST /api/v1/bets/status */
export type GoBetStatusRequest = {
  bet_ids: string[];
};

export type GoBetStatusResponse = {
  statuses: Array<{
    bet_id: string;
    status: string;
  }>;
};
