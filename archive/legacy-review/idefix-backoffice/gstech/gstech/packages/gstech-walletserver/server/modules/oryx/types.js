/* @flow */

export type AuthenticateRequest = {
  gameCode: string,
};

export type BalanceRequest = {
  gameCode: string,
};

export type TransactionRequest = {
  playerId: string,
  roundId: string,
  gameCode: string,
  roundAction: 'NONE' | 'CLOSE' | 'CANCEL',
  bet?: {
    transactionId: string,
    amount: Money,
    timestamp: number,
  },
  win?: {
    transactionId: string,
    amount: Money,
    jackpotAmount?: Money,
    timestamp: number,
  },
  freeRoundId?: string,
  freeRoundExternalId?: string,
};

export type RollbackRequest = {
  playerId: string,
  action: 'CANCEL',
  transactionId: string,
  gameCode: string,
  roundId: string,
};
