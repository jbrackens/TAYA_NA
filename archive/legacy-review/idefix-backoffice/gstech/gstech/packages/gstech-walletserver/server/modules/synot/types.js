/* @flow */

export type GetSessionRequest = {
  apiKey: string,
  token: string,
  requestId: string,
  signature?: string,
};

export type GetSessionResponse = {
  playerId: string,
  playerName: string,
  language: string,
  currency: string,
  realBalance: number,
  bonusBalance: number,
  exitUrl: string,
  historyUrl: string,
  checkStart: string, // the real type is Integer, but it should be an empty string for some reason
  checkInterval: string, // the real type is Integer, but it should be an empty string for some reason
  token: string,
  requestId: string,
  signature?: string,
};

export type GetBalanceRequest = {
  playerId: string,
  token: string,
  requestId: string,
  signature?: string,
};

export type GetBalanceResponse = {
  realBalance: number,
  bonusBalance: number,
  requestId: string,
  signature?: string,
};

export type BetRequest = {
  playerId: string,
  transactionId: string, // BigInt
  gameCode: string,
  roundId: string, // BigInt
  realAmount: number, // Decimal
  token: string,
  requestId: string,
  freeRoundsId?: string,
  signature?: string,
};

export type BetResponse = {
  reference: string,
  realAmount: number,
  bonusAmount: number,
  realBalance: number,
  bonusBalance: number,
  requestId: string,
  signature?: string,
};

export type WinRequest = {
  playerId: string,
  transactionId: string, // BigInt
  gameCode: string,
  roundId: string, // BigInt
  realAmount: number, // Decimal
  isFinal: boolean,
  token: string,
  requestId: string,
  freeRoundsId?: string,
  signature?: string,
};

export type WinResponse = {
  reference: string,
  realAmount: number,
  bonusAmount: number,
  realBalance: number,
  bonusBalance: number,
  requestId: string,
  signature?: string,
};

export type RollbackRequest = {
  playerId: string,
  transactionId: string, // BigInt
  originalTransactionId: string, // BigInt
  realAmount: number, // Decimal
  bonusAmount: number, // Decimal
  token: string,
  requestId: string,
  signature?: string,
};

export type RollbackResponse = {
  reference: string,
  realAmount: number,
  bonusAmount: number,
  realBalance: number,
  bonusBalance: number,
  requestId: string,
  signature?: string,
};
