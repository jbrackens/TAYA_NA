/* @flow */

export type IDENTIFICATION = {
  name: string,
  key: string,
};

export type MONEY = {
  amount: string, // "amount":"12345.678"
  currency: CurrencyId,
};

export type INFORMATION = {
  uniqueReference: string,
  gameRoundId: string,
  game: string,
  time: Date,
};

export type ValidateTokenRequest = {
  identification: IDENTIFICATION,
  token: string,
  game: string,
};

export type ValidateTokenResponse = {
  userId: string,
  username: string,
  balance: MONEY,
};

export type WithdrawRequest = {
  identification: IDENTIFICATION,
  userId: string,
  withdraw: MONEY,
  information: INFORMATION,
};

export type WithdrawResponse = {
  balance: MONEY,
  transactionId: string,
};

export type DepositRequest = {
  identification: IDENTIFICATION,
  userId: string,
  deposit: MONEY,
  promoName: string,
  information: INFORMATION,
};

export type DepositResponse = {
  balance: MONEY,
  transactionId: string,
};

export type RollbackRequest = {
  identification: IDENTIFICATION,
  userId: string,
  information: INFORMATION,
};

export type RollbackResponse = {
  balance: MONEY,
  transactionId: string,
};

export type BalanceRequest = {
  identification: IDENTIFICATION,
  userId?: string,
  userIds?: string[],
};

export type BalanceResponse = {
  balance?: MONEY,
  balances?: { [string]: MONEY },
};

export type KeepAliveRequest = {
  identification: IDENTIFICATION,
  userIds: string[],
};

export type KeepAliveResponse = {};

export type NolimitCityRequest<T>= {
  jsonrpc: string,
  id: UUID,
  method: 'wallet.validate-token' | 'wallet.withdraw' | 'wallet.deposit' | 'wallet.rollback' | 'wallet.balance' | 'wallet.keep-alive',
  params: T,
};

export type NolimitCityResponse<T> = {
  jsonrpc: string,
  id: UUID,
  result: T,
};

export type ErrorResponse = {
  jsonrpc: string,
  id: UUID,
  error: {
    code: number, // -32000
    message: string,
    data: {
      code: number, // 14001
      message: string,
    },
  },
};
