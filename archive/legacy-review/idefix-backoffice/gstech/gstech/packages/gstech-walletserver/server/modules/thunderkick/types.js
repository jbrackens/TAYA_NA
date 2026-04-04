/* @flow */
export type ThunderkickMoney = string;

export type Amount = {
  amount: string,
  currency: string,
};

export type Account = {
  balance: Amount,
  accountId: string,
  accountType: string,
};

export type Bet = {
  bet: Amount,
  accountId: string,
  accountType: string,
}

export type Win = {
  win: Amount,
  accountId: string,
  accountType: string,
}

export type GameRound = {
  gameName: string,
  gameRoundId: number,
  providerGameRoundId: number,
  providerId: number,
  gameRoundStartDate: string,
  gameRoundEndDate: string,
  numberOfBets: number,
  numberOfWins: number,
}

export type MetaGameTagDetail = {
  symbolid: number,
  paylineid: number,
}

export type MetaGameTag = {
  id: string,
  details: MetaGameTagDetail,
}

export type ThunderkickRequest = {
  providerId: string, // ??
  playerExternalReference: string,
};

export type ThunderkickResponse = { ... };

export type ThunderkickErrorResponse = {
  errorCode: string,
  errorMessage: string,
};

export type BalancesRequest = {
  playerExternalReference: string,
  playerSessionToken: string,
  operatorSessionToken: string,
  gameName: string,
  distributionChannel: string,
} & ThunderkickRequest;

export type BalancesResponse = {
  moneyAccounts: Account[],
} & ThunderkickResponse;

export type BetAndWinRequest = {
  playerId: number,
  playerExternalReference: string,
  ipAddress: string,
  gameRound: GameRound,
  gameSessionToken: string,
  playerSessionToken: string,
  operatorSessionToken: string,
  distributionChannel: string,
  bets: Bet[],
  betTime: string,
  wins: Win[],
  winTime: string,
  winTransactionId: number,
  metaGameTags: MetaGameTag[],
} & ThunderkickRequest;

export type BetAndWinResponse = {
  balances: BalancesResponse,
  extBetTransactionId: string,
  extWinTransactionId: string,
} & ThunderkickResponse;

export type BetRequest = {
  playerId: number,
  playerExternalReference: string,
  ipAddress: string,
  gameRound: GameRound,
  gameSessionToken: string,
  playerSessionToken: string,
  operatorSessionToken: string,
  distributionChannel: string,
  bets: Bet[],
  betTime: string,
  metaGameTags: MetaGameTag[],
} & ThunderkickRequest;

export type BetResponse = {
  balances: BalancesResponse,
  extBetTransactionId: string,
} & ThunderkickResponse;

export type WinRequest = {
  playerId: number,
  playerExternalReference: string,
  ipAddress: string,
  gameRound: GameRound,
  gameSessionToken: string,
  playerSessionToken: string,
  operatorSessionToken: string,
  distributionChannel: string,
  wins: Win[],
  winTime: string,
  metaGameTags: MetaGameTag[],
} & ThunderkickRequest;

export type WinResponse = {
  balances: BalancesResponse,
  extWinTransactionId: string,
} & ThunderkickResponse;

export type RollbackBetAndWinRequest = {
  playerId: number,
  playerExternalReference: string,
  gameSessionToken: string,
  operatorSessionToken: string,
  gameName: string,
  gameRoundId: number,
  betAmount: Amount,
  numberOfWins: number,
  rollbackTime: string,
  betTransactionId: number,
  winTransactionId: number,
  betTime: string,
  numberOfRetries: number,
  externalAccountId: string,
  accountType: string,
} & ThunderkickRequest;

export type RollbackBetAndWinResponse = {
  balances: BalancesResponse,
  extRollbackTransactionId: string,
} & ThunderkickResponse;

export type RollbackBetRequest = {
  playerId: number,
  playerExternalReference: string,
  gameSessionToken: string,
  operatorSessionToken: string,
  gameName: string,
  gameRoundId: number,
  betAmount: Amount,
  rollbackTime: string,
  betTransactionId: number,
  betTime: string,
  numberOfRetries: number,
  externalAccountId: string,
  accountType: string,
} & ThunderkickRequest;

export type RollbackBetResponse = {
  balances: BalancesResponse,
  extRollbackTransactionId: string,
} & ThunderkickResponse;

export type FreeRoundsResultRequest = {
  playerId: number,
  playerExternalReference: string,
  ipAddress: string,
  gameName: string,
  gameSessionToken: string,
  playerSessionToken: string,
  operatorSessionToken: string,
  distributionChannel: string,
  totalWin: Amount,
  playerFreeRoundsReference: string,
} & ThunderkickRequest;

export type FreeRoundsResultResponse = {
  balances: BalancesResponse,
  extFreeRoundsResultTransactionId: string,
} & ThunderkickResponse;

const errors = {
  INTERNAL_SERVER_ERROR: { httpcode: 500, code: 500, message: 'Internal Server Error' },

  INVALID_PLAYER_SESSION: { httpcode: 522, code: 100, message: 'Invalid player session' },
  INVALID_GAME_SESSION: { httpcode: 522, code: 101, message: 'Invalid game session' },
  INVALID_ACCOUNT: { httpcode: 522, code: 210, message: 'Invalid account' },
  ROLLBACK_BET_TRANSACTION: { httpcode: 522, code: 251, message: 'Rollback bet transaction' },
  INVALID_BET_TRANSACTION: { httpcode: 522, code: 250, message: 'Invalid bet transaction' },
  INVALID_WIN_TRANSACTION: { httpcode: 522, code: 260, message: 'Invalid win transaction' },
  RETRY_WIN_TRANSACTION: { httpcode: 522, code: 262, message: 'Retry win transaction' },
  INVALID_BETANDWIN_TRANSACTION: { httpcode: 522, code: 270, message: 'Invalid betAndWin transaction' },
  INVALID_FREEROUNDSRESULT_TRANSACTION: { httpcode: 522, code: 280, message: 'Invalid freeRoundsResult transaction' },
  RETRY_FREEROUNDSRESULT_TRANSACTION: { httpcode: 522, code: 282, message: 'Retry freeRoundsResult transaction' },

  NOT_ENOUGH_MONEY: { httpcode: 523, code: 200, message: 'Not enough money' },
  PLAYER_SPENDING_LIMIT_REACHED: { httpcode: 523, code: 201, message: 'Player spending limit reached' },
  ROLLBACK_BETANDWIN_TRANSACTION: { httpcode: 523, code: 271, message: 'Rollback betAndWin transaction' },
  CMA_ACCOUNT_SWITCH: { httpcode: 523, code: 253, message: 'CMA account switch, bet is rejected' },
};

module.exports = {
  errors,
};
