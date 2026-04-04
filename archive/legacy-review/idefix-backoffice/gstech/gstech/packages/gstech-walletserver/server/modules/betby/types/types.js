/* @flow */

export type BetbyErrorResponse = {
  code: number,
  message: string,
};

// Common types =================================================

export type BetbyTransaction = {
  id: string,
  betslip_id: string,
  player_id: string,
  operator_id: string,
  operator_brand_id: string,
  ext_player_id: string,
  timestamp: number,
  amount: number,
  currency: string,
  cross_rate_euro: string,
  operation: string,
  bonus_id?: string,
};

export type BetbyBet = {
  id: string,
  event_id: string,
  sport_id: string,
  tournament_id: string,
  category_id: string,
  live?: boolean,
  sport_name?: string,
  category_name?: string,
  tournament_name?: string,
  competitor_name?: string[],
  market_name?: string,
  outcome_name?: string,
  scheduled?: number,
  odds?: string,
};

export type BetbyBetslip = {
  id: string,
  timestamp: number,
  player_id: string,
  operator_id: string,
  operator_brand_id: string,
  ext_player_id: string,
  currency: string,
  type: string,
  sum: number,
  k: string,
  is_quick_bet: boolean,
  bets: BetbyBet[],
};

export type BetbyBetWinSelection = {
  id: string,
  event_id: string,
  status: string,
  odds?: string,
};

export type BetbyBetLostSelection = {
  id: string,
  event_id: string,
  status: string,
};

export type BetbyIdentifyFeatureFlags = {
  is_cashout_available: boolean,
  is_match_tracker_available: boolean,
};


// Requests =========================================================

export type BetbyBetMakeRequest = {
  amount: number,
  currency: string,
  player_id: string,
  session_id?: string,
  bonus_id?: number,
  bonus_type?: string,
  transaction: BetbyTransaction,
  betslip: BetbyBetslip,
  potential_win: number,
  potential_comboboost_win: number,
};

export type BetbyBetCommitRequest = {
  bet_transaction_id: string,
};

export type BetbyBetSettlementRequest = {
  status: string,
  bet_transaction_id: string,
};

export type BetbyBetRefundRequest = {
  bet_transaction_id: string,
  reason: string,
  bonus_id?: string,
  transaction: BetbyTransaction,
};

export type BetbyBetWinRequest = {
  amount: number,
  currency: string,
  is_cashout?: boolean,
  bet_transaction_id: string,
  transaction: BetbyTransaction,
  is_snr_lost: boolean,
  selections: BetbyBetWinSelection[],
  odds?: string,
  bonus_id?: string,
  bonus_type?: string,
  comboboost_multiplier?: string,
};

export type BetbyBetLostRequest = {
  bet_transaction_id: string,
  amount: number,
  currency: string,
  transaction: BetbyTransaction,
  selections: BetbyBetLostSelection[],
};

export type BetbyBetDiscardRequest = {
  ext_player_id: string,
  transaction_id: string,
  reason: string,
};

export type BetbyBetRollbackRequest = {
  bet_transaction_id: string,
  parent_transaction_id: string,
  transaction: BetbyTransaction,
};

// Responses =======================================================

export type BetbyIdentifyResponse = {
  user_id: string,
  username: string,
  lang: string,
  currency: string,
  balance: number,
  feature_flags?: BetbyIdentifyFeatureFlags,
  session_id?: string,
  odds_format?: string,
};

export type BetbyBetMakeResponse = {
  id: string,
  ext_transaction_id: string,
  parent_transaction_id: string,
  user_id: string,
  operation: string,
  amount: number,
  currency: string,
  balance: number,
};

export type BetbyBetRefundResponse = {
  id: string,
  ext_transaction_id: string,
  parent_transaction_id: string,
  user_id: string,
  operation: string,
  amount: number,
  currency: string,
  balance: number,
};

export type BetbyBetWinResponse = {
  id: string,
  ext_transaction_id: string,
  parent_transaction_id: string,
  user_id: string,
  operation: string,
  amount: number,
  currency: string,
  balance: number,
};

export type BetbyBetLostResponse = {
  id: string,
  ext_transaction_id: string,
  parent_transaction_id: string,
  user_id: string,
  operation: string,
  balance: number,
};

export type BetbyBetRollbackResponse = {
  id: string,
  ext_transaction_id: string,
  parent_transaction_id: string,
  user_id: string,
  operation: string,
  amount: number,
  currency: string,
  balance: number,
};
