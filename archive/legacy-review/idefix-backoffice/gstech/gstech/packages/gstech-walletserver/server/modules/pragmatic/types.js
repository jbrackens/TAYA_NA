/* @flow */
export type PragmaticMoney = string;

const SUCCESS = '0';
const INSUFFICIENT_BALANCE = '1';
const PLAYER_NOT_FOUND = '2';
const BET_NOT_ALLOWED = '3';
const EXPIRED_TOKEN = '4';
const INVALID_HASH = '5';
const PLAYER_FROZEN = '6';
const BAD_PARAMETERS = '7';
const GAME_NOT_FOUND = '8';
const BET_LIMIT_REACHED = '50';
const INTERNAL_SERVER_ERROR_RETRY = '100';
const INTERNAL_SERVER_ERROR_IGNORE = '120';
const REALITY_CHECK_WARNING = '200';

const errors = {
  SUCCESS,
  INSUFFICIENT_BALANCE,
  PLAYER_NOT_FOUND,
  BET_NOT_ALLOWED,
  EXPIRED_TOKEN,
  INVALID_HASH,
  PLAYER_FROZEN,
  BAD_PARAMETERS,
  GAME_NOT_FOUND,
  BET_LIMIT_REACHED,
  INTERNAL_SERVER_ERROR_RETRY,
  INTERNAL_SERVER_ERROR_IGNORE,
  REALITY_CHECK_WARNING,
};

export type ErrorType = $Keys<typeof errors>;

export type PragmaticRequest = {
  hash: string,
  userId: string,
  providerId: string,
};

export type PragmaticResponse = {
  error: ErrorType,
  description: string,
};

export type BalanceRequest = {} & PragmaticRequest;
export type BetRequest = {
  gameId: string,
  roundId: string,
  amount: PragmaticMoney,
  reference: string,
  timestamp: string,
  roundDetails: string,
  bonusCode?: string,
  platform?: 'MOBILE' | 'WEB' | 'DOWNLOAD',
  jackpotContribution?: PragmaticMoney,
  jackpotId?: string,
  token?: string,
} & PragmaticRequest;

export type ResultRequest = {
  gameId: string,
  roundId: string,
  amount: PragmaticMoney,
  reference: string,
  timestamp: string,
  roundDetails: string,
  bonusCode?: string,
  platform?: 'MOBILE' | 'WEB' | 'DOWNLOAD',
  token?: string,
} & PragmaticRequest;

export type BonusWinRequest = {
  amount: PragmaticMoney,
  reference: string,
  timestamp: string,
  bonusCode?: string,
  token?: string,
} & PragmaticRequest;

export type BonusWinResponse = {
  currency: string,
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
};

export type JackpotWinRequest = {
  gameId: string,
  roundId: string,
  jackpotId: string,
  amount: PragmaticMoney,
  reference: string,
  timestamp: string,
  bonusCode?: string,
  token?: string,
} & PragmaticRequest;

export type RefundRequest = {
  reference: string,
  platform?: 'MOBILE' | 'WEB' | 'DOWNLOAD',
  amount?: PragmaticMoney,
  gameId?: string,
  roundId?: string,
  timestamp?: string,
  roundDetails?: string,
  bonusCode?: string,
  token?: string,
} & PragmaticRequest;

export type EndRoundRequest = {
  gameId: string,
  roundId: string,
  platform?: 'MOBILE' | 'WEB' | 'DOWNLOAD',
} & PragmaticRequest;

export type BalanceResponse = {
  currency: string,
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
};

export type BetResponse = {
  transactionId: number,
  currency: string,
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
  usedPromo: '0' | '1',
};

export type ResultResponse = {
  transactionId: number,
  currency: string,
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
};

export type EndRoundResponse = {
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
  currency: string
};

export type RefundResponse = {
  transactionId: number,
};

export type AuthenticateRequest = {
  token: string,
} & PragmaticRequest;

export type AuthenticateResponse = {
  userId: string,
  currency: string,
  cash: PragmaticMoney,
  bonus: PragmaticMoney,
  token?: string,
  country?: string,
  jurisdiction?: string,
};

module.exports = {
  errors,
};
