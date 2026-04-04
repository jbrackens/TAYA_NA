/* @flow */

export type MemberDetailsRequest = {
  auth_token: string,
  hash: string,
};

export type BalanceRequest = {
  user_id: string,
  hash: string,
};

export type BetPlacedRequest = {
  user_id: string,
  bet_transaction_id: string,
  real: number,
  virtual: number,
  created_at: Date,
  details: string,
  hash: string,
};

export type BetUpdatedRequest = {
  user_id: string,
  transaction_id: string,
  bet_transaction_id: string,
  real: number,
  virtual: number,
  details: string,
  hash: string,
};

export type BalanceUpdatedRequest = {
  user_id: string,
  transaction_id: string,
  bet_transaction_id: string,
  amount: number,
  reason: number,
  created_at: Date,
  hash: string,
};

