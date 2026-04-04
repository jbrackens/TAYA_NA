/* @flow */
const validate = require('uuid-validate');
const first = require('lodash/fp/first');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { decrypt } = require('gstech-core/modules/crypt');
const { mapLanguageId, MANUFACTURER_ID, encryptionKey } = require('./constants');

export type ResultValue = 'SUCCESS' | 'FAILURE';
export type GameContext = 'mobile' | 'desktop' | 'minigame';
export type UserAction = 'OK' | 'EXIT' | 'STOP';
export type UserActionDisplayType = 'DIRECT' | 'END_OF_GAME';

const parseAccountRef = (request: { accountRef: string, ... }) => {
  const items = request.accountRef.split('_');
  if (items.length !== 2) {
    throw Error(`Invalid accountRef: ${request.accountRef}`);
  }
  const [brandId, pid] = items;
  const playerId = Number(pid);
  if (Number.isNaN(playerId)) {
    throw Error(`Invalid accountRef: ${request.accountRef}`);
  }
  const result = {
    brandId,
    playerId,
    accountRef: request.accountRef,
  };
  return result;
};

const parseTicket = (request: { accountRef: string, ticket: string, ... }) => {
  const { accountRef } = parseAccountRef(request);
  if (!validate(request.ticket)) {
    const sessionId = decrypt(encryptionKey + accountRef, request.ticket);
    if (validate(sessionId)) {
      return {
        sessionId,
      };
    }
  }
  throw Error(`Invalid initial ticket: ${request.ticket}`);
};

const parseInitialTicket = (request: { accountRef: string, ticket: string, ... }) => {
  const { playerId, brandId, accountRef } = parseAccountRef(request);
  parseTicket(request);
  const result: any = {
    accountRef,
    playerId,
    brandId,
  };
  return result;
};


export type AuthenticateRequest = {
  ticket: string,
  accountRef: string,
  context: GameContext,
  gameCode: string,
  partnerParameters?: string[],
  brand?: string,
};

export type AuthenticateResponse = {
  accountRef: string,
  currency: string,
  result: ResultValue,
  language: string,
  replacementTicket?: string,
  balance: Money,
  message?: string,
  language?: string,
  userName?: string,
};

const authenticate = async (request: AuthenticateRequest): Promise<AuthenticateResponse> => {
  const { accountRef, playerId } = parseInitialTicket(request);
  const { currencyId, languageId, username } = await api.getPlayer(playerId);
  const { balance } = await api.getBalance(playerId);
  const result = {
    accountRef,
    currency: currencyId,
    result: 'SUCCESS',
    language: mapLanguageId(languageId),
    balance,
    userName: username,
  };
  return result;
};

export type GetBalanceRequest = {
  accountRef: string,
  currency: string,
  ticket: string,
  gameCode: string,

};
export type GetBalanceResponse = {
  balance: Money,
  message?: string,
  result: ResultValue,
  replacementTicket?: string,
  requiredUserAction?: UserAction,
  requiredDisplayTime?: UserActionDisplayType,
};

const getBalance = async (request: GetBalanceRequest, checkTicket: boolean = true): Promise<GetBalanceResponse> => {
  const { playerId } = parseAccountRef(request);
  if (checkTicket) {
    parseTicket(request);
  }
  const { balance } = await api.getBalance(playerId);
  return { balance, result: 'SUCCESS' };
};

export type Jackpot = { jackpotId: string, amount: Money };
export type PartnerParameter = { name: string, value: string };
export type TransferToGameRequest = {
  accountRef: string,
  ticket: string,
  gameRoundId: string,
  transactionId: string,
  amount: Money,
  currency: string,
  timestamp: Date,
  gameCode: string,
  context: GameContext,
  campaignId?: string,
  promoAmount?: Money,
  partnerParameters?: PartnerParameter[],
  brand?: string,
  jackpotContributions?: Jackpot[],
};
export type TransferToGameResponse = {
  balance: Money,
  message?: string,
  partnerTransactionRef: string,
  replacementTicket?: string,
  reconcile?: boolean,
  requiredUserAction?: UserAction,
  requiredDisplayTime?: UserActionDisplayType,
  result: ResultValue,
};
const transferToGame = async (request: TransferToGameRequest): Promise<TransferToGameResponse> => {
  const {
    amount,
    gameCode,
    gameRoundId,
    transactionId,
    timestamp,
    currency,
  } = request;

  try {
    const { sessionId } = parseTicket(request);
    const { brandId, playerId } = parseAccountRef(request);
    const wdReq = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount,
      game: gameCode,
      sessionId,
      gameRoundId,
      transactionId,
      timestamp,
      currencyId: currency,
      wins: undefined,
    };
    const { balance, transactionId: txId } = await api.bet(playerId, wdReq);
    return {
      balance,
      partnerTransactionRef: `${txId}`,
      result: 'SUCCESS',
    };
  } catch (e) {
    if (e.code && e.code === 10006) {
      return Promise.reject({ code: 1 /* ERROR_NOT_ENOUGH_MONEY */ });
    }
    if (e.code && e.code === 10008) {
      return Promise.reject({ code: 2 /* ERROR_PLAYER_LIMIT_EXCEEDED */ });
    }
    throw e;
  }
};

export type CancelTransferToGameRequest = {
  accountRef: string,
  gameRoundId: string,
  transactionId: string,
  canceledTransactionId: string,
  amount: Money,
  currency: string,
  timestamp: Date,
  gameCode: string,
  context: GameContext,
  campaignId?: string,
  promoAmount?: Money,
};
export type CancelTransferToGameResponse = {
  balance: Money,
  message?: string,
  partnerTransactionRef: string,
  result: string,
};

const cancelTransferToGame = async (request: CancelTransferToGameRequest): Promise<CancelTransferToGameResponse> => {
  const { brandId, playerId } = parseAccountRef(request);
  const {
    transactionId,
    gameRoundId,
    canceledTransactionId,
    timestamp,
    amount,
  } = request;
  const { transactionIds, invalidTransaction } = await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: MANUFACTURER_ID,
    transactionId: canceledTransactionId,
    cancelTransactionId: transactionId,
    gameRoundId,
    amount,
    timestamp,
  });
  const { balance } = await api.getBalance(playerId);

  if (invalidTransaction) {
    throw new Error('Invalid transaction');
  }
  return {
    balance,
    partnerTransactionRef: `${first(transactionIds)}`,
    result: 'SUCCESS',
  };
};

export type TransferFromGameRequest = {
  accountRef: string,
  gameRoundId: string,
  transactionId: string,
  amount: Money,
  currency: string,
  timestamp: Date,
  gameCode: string,
  context: GameContext,
  campaignId?: string,
  promoAmount?: Money,
  partnerParameters?: PartnerParameter[],
  brand?: string,
  jackpotContributions?: Jackpot[],
};
export type TransferFromGameResponse = {
  balance: Money,
  message?: string,
  partnerTransactionRef: string,
  result: string,
};

const transferFromGame = async (request: TransferFromGameRequest): Promise<TransferToGameResponse> => {
  const {
    amount,
    gameCode,
    gameRoundId,
    transactionId,
    timestamp,
    currency,
  } = request;
  const { brandId, playerId } = parseAccountRef(request);

  const depositReq = {
    brandId,
    wins: [{ type: 'win', amount }],
    manufacturer: MANUFACTURER_ID,
    game: gameCode,
    closeRound: true,
    gameRoundId,
    transactionId,
    timestamp,
    sessionId: undefined,
    currencyId: currency,
    createGameRound: false,
  };
  const { balance, transactionId: txId } = await api.win(playerId, depositReq);
  return {
    balance,
    partnerTransactionRef: `${txId}`,
    result: 'SUCCESS',
  };
};

module.exports = {
  authenticate,
  getBalance,
  transferToGame,
  cancelTransferToGame,
  transferFromGame,
};
