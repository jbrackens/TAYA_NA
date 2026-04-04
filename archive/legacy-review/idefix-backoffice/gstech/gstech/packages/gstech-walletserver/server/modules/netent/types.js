/* @flow */
import type { NetentConfig, ExtendedConfig } from '../../types';

const SHOW_MESSAGE_IMMEDIATELY_CLOSE = 990;
const SHOW_MESSAGE_IMMEDIATELY_CONTINUE = 991;
const SHOW_MESSAGE_GAME_ROUND_CLOSE = 992;
const SHOW_MESSAGE_GAME_ROUND_CONTINUE = 993;

const ERROR_NOT_ENOUGH_MONEY = 1;
const ERROR_ILLEGAL_CURRENCY = 2;
const ERROR_NEGATIVE_DEPOSIT = 3;
const ERROR_NEGATIVE_WITHDRAWAL = 4;
const ERROR_AUTHENTICATION_FAILED = 5;
const ERROR_PLAYER_LIMIT_EXCEEDED = 6;

export type NetentMoney = string;
export type NetentId = string;

export type BonusProgram = {
  bonusProgramId: Id,
  depositionId: Id,
};

export type BonusPrograms = {
  bonus: BonusProgram,
  groupIdentifier: ?string,
};

export type Tournament = {
  tournamentId: Id,
  tournamentOccurrenceId: Id,
};

export type DepositError = {
  errorCode: 2 | 3 | 5,
  message: string,
};

export type DepositReason = 'AWARD_TOURNAMENT_WIN' | 'WAGERED_BONUS' | 'CLEAR_HANGED_GAME_STATE' | 'GAME_PLAY' | 'GAME_PLAY_FINAL' | 'FREE_ROUND_PLAY' | 'FREE_ROUND_FINAL';


export type NetentBrandConfiguration = {
  merchantId: string,
  merchantPassword: string,
  lobbyUrl: string,
  config?: mixed,
};

export type AuthenticatedRequest = {
  callerId: string,
  callerPassword: string,
  conf: ExtendedConfig<NetentConfig>,
};

export type AuthenticatedPlayerRequest = {
  playerName: string,
  conf: NetentConfig,
} & AuthenticatedRequest;

export type DepositRequest = {
  amount: NetentMoney,
  bonusPrograms: BonusPrograms,
  tournaments: Tournament[],
  bigWin: boolean,
  jackpotAmount: NetentMoney,
  bonusWin: NetentMoney,
  currency: string,
  transactionRef: NetentId,
  gameRoundRef: NetentId,
  gameId: string,
  reason: DepositReason,
  source: string,
  startDate: string,
  sessionId: ?string,
  freeRoundWin: mixed,
} & AuthenticatedPlayerRequest;

export type DepositResponse = {
  balance: NetentMoney,
  transactionId: Id,
  message?: string,
};

export type GetBalanceRequest = {
  currency: string,
  gameId: string,
  sessionId: ?string,
} & AuthenticatedPlayerRequest;

export type GetBalanceResponse = {
  balance: NetentMoney,
};

export type GetBalanceErrorResponse = {
  errorCode: 2 | 5,
  message: string,
};

export type GetPlayerCurrencyRequest = {
  sessionId: ?string,
} & AuthenticatedPlayerRequest;

export type GetPlayerCurrencyResponse = {
  currencyIsoCode: string,
};

export type GetPlayerCurrencyErrorResponse = {
  errorCode: 5,
  message: string,
};

export type RollbackTransactionRequest = {
  transactionRef: NetentId,
  gameId: string,
  sessionId: ?string,
} & AuthenticatedPlayerRequest;

export type RollbackTransactionResponse = { };

export type RollbackTransactionErrorResponse = {
  errorCode: 5,
  message: string,
};

export type JackpotContributions = {
  jackpotId: string,
  contribution: NetentMoney,
};
export type WithdrawRequestReason = 'GAME_PLAY' | 'GAME_PLAY_FINAL' | 'FREE_ROUND_PLAY' | 'FREE_ROUND_FINAL';
export type WithdrawRequest = {
  amount: NetentMoney,
  bonusBet: NetentMoney,
  jackpotContributions: JackpotContributions,
  currency: string,
  transactionRef: NetentId,
  gameRoundRef: NetentId,
  gameId: string,
  reason: WithdrawRequestReason,
  sessionId: ?string,
  freeRoundBet: mixed,
} & AuthenticatedPlayerRequest;

export type WithdrawResponse = {
  balance: NetentMoney,
  transactionId: Id,
  message: ?string,
};

export type WithdrawErrorMessage = {
  errorCode: 1 | 2 | 4 | 5 | 6,
  message: ?string,
  balance: NetentMoney,
};

export type WithdrawAndDepositRequestReason = 'GAME_PLAY' | 'GAME_PLAY_FINAL' | 'WAGERED_BONUS' | 'AWARD_TOURNAMENT_WIN';
export type WithdrawAndDepositRequest = {
  withdraw: NetentMoney,
  deposit: NetentMoney,
  bigWin: boolean,
  jackpotAmount: NetentMoney,
  bonusWin: NetentMoney,
  bonusBet: NetentMoney,
  bonusPrograms: BonusPrograms,
  tournaments: Tournament[],
  jackpotContributions: JackpotContributions,
  currency: string,
  transactionRef: NetentId,
  gameRoundRef: NetentId,
  gameId: string,
  reason: WithdrawAndDepositRequestReason,
  source: string,
  startDate: string,
  sessionId: ?string,
} & AuthenticatedPlayerRequest;

export type WithdrawAndDepositResponse = {
  newBalance: NetentMoney,
  transactionId: Id,
};

export type WithdrawAndDepositErrorResponse = {
  errorCode: 1 | 2 | 3 | 4 | 5 | 6,
  message: string,
  balance: NetentMoney,
};

export type MessageCode = 990 | 991 | 992 | 993;

module.exports = {
  SHOW_MESSAGE_IMMEDIATELY_CLOSE,
  SHOW_MESSAGE_IMMEDIATELY_CONTINUE,
  SHOW_MESSAGE_GAME_ROUND_CLOSE,
  SHOW_MESSAGE_GAME_ROUND_CONTINUE,
  ERROR_NOT_ENOUGH_MONEY,
  ERROR_ILLEGAL_CURRENCY,
  ERROR_NEGATIVE_DEPOSIT,
  ERROR_NEGATIVE_WITHDRAWAL,
  ERROR_AUTHENTICATION_FAILED,
  ERROR_PLAYER_LIMIT_EXCEEDED,
};
