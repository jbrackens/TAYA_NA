/* @flow */

export type GameEventRequest = {
  session_id: string,
  player_id: string,
  round: number,
  type: 'spin' | 'freespin' | 'gamble',
  bet: string,
  win: string,
  freespins: { },
  operator_data: string,
  customer_id: string,
};

export type GameEventResponse = {
  balance: string,
  return: string,
  error: string,
};

export type ErrorType = 'low_balance' | 'reality_check' | 'self_excluded' | 'loss_limit' | 'wager_limit' | 'custom';
