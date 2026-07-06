// ── Go Retention / Promotions API Types ──

/** GET /api/v1/freebets */
export type GoFreebet = {
  id: string;
  amount: number;
  status: string;
  expires_at?: string;
  created_at: string;
};

export type GoFreebetsResponse = {
  data: GoFreebet[];
};

/** GET /api/v1/odds-boosts */
export type GoOddsBoost = {
  id: string;
  boost_percentage: number;
  status: string;
  expires_at?: string;
  created_at: string;
};

export type GoOddsBoostsResponse = {
  data: GoOddsBoost[];
};

/** POST /api/v1/odds-boosts/{oddsBoostId}/accept */
export type GoAcceptOddsBoostResponse = {
  success: boolean;
};
