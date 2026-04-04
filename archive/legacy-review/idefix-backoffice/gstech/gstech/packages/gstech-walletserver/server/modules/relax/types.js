/* @flow */

export type VerifyTokenRequest = {
  channel: string,
  clientId: string,
  token: string,
  gameref?: string,
};

export type VerifyTokenResponse = {
  customerid: string,
  countrycode: string,
  cashiertoken: string,
  customercurrency: string,
  balance: number,
  jurisdiction: string,
};

export type BalanceRequest = {
  customerid: string,
  cashiertoken?: string,
  currency: string,
  gameref?: string,
  channel?: string,
};

export type BalanceResponse = {
  customercurrency: string,
  balance: number,
};

export type WithdrawRequest = {
  gameid: string,
  customerid: string,
  gamesessionid: string,
  gameref: string,
  channel: string,
  clientid: string,
  currency: string,
  cashiertoken: string,
  txid: number,
  amount: number,
  txtype: string,
  ended: boolean,
  jpcontribution?: number[],
  buyfeature?: boolean,
};

export type WithdrawResponse = {
  balance: number,
  txid: number,
  remotetxid: string,
};

export type DepositRequest = {
  gameid: string,
  customerid: string,
  gamesessionid: string,
  gameref: string,
  channel: string,
  clientid: string,
  currency: string,
  cashiertoken?: string,
  txid: number,
  amount: number,
  txtype: string,
  ended: boolean,
  promocode?: string,
  jackpotpayout?: Array<[number, number]>,
  promotionid?: string,
};

export type DepositResponse = {
  balance: number,
  txid: number,
  remotetxid: string,
};

export type RollbackRequest = {
  customerid: string,
  txid: number,
  originaltxid: number,
  gamesessionid: string,
};

export type RollbackResponse = {
  balance: number,
  txid: number,
  remotetxid: string,
};

export type CancelFreeSpinsRequest = {
  gameref: string,
  cashiertoken: string,
  customerid: string,
  txid: number,
  freespinid: number,
  promocode?: string,
};

export type RelaxAddFreeRoundsRequest = {
  txid: string,
  remoteusername: string,
  gameid: string,
  amount: number,
  freespinvalue: number,
  expire?: number,
  promocode?: string,
};

export type RelaxAddFreeRoundsResponse = {
  status: string,
  txid: string,
  freespinids: Array<[string, number]>,
};

export type RelaxBetAmounts = {
  betAmounts: number[],
};

export type RelaxError = {
  errorcode: string,
  message: string,
  status: number,
};

const RLX_INVALID_TOKEN: RelaxError = {
  errorcode: 'INVALID_TOKEN',
  message: 'The token could not be verified.',
  status: 401,
};

const RLX_BLOCKED: RelaxError = {
  errorcode: 'BLOCKED_FROM_PRODUCT',
  message: 'Blocked from product.',
  status: 403,
};

const RLX_COMMON_ERROR: RelaxError = {
  errorcode: 'UNHANDLED',
  message: 'Unable to process by request.',
  status: 500,
};

const RLX_INSUFFICIENT_FUNDS: RelaxError = {
  errorcode: 'INSUFFICIENT_FUNDS',
  message: 'There are insufficient funds to go through with the withdrawal.',
  status: 403,
};

const RLX_TRANSACTION_DECLINED: RelaxError = {
  errorcode: 'TRANSACTION_DECLINED',
  message: 'There are no comparable transaction.',
  status: 403,
};

module.exports = {
  RLX_INVALID_TOKEN,
  RLX_BLOCKED,
  RLX_COMMON_ERROR,
  RLX_INSUFFICIENT_FUNDS,
  RLX_TRANSACTION_DECLINED,
};
