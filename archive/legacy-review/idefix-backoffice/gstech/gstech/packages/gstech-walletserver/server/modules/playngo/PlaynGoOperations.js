/* @flow */
import type { GameProvider } from "gstech-core/modules/constants";
import type { PlaynGoTransactionType, PlaynGoSessionState } from './constants';

const validate = require('uuid-validate');
const first = require('lodash/fp/first');
const find = require('lodash/find');
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { mapLanguageId, statusCodes, transactionTypes } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.playngo;

export type PlaynGoMoney = string;

const formatMoney = (amount: Money): PlaynGoMoney => (amount / 100).toFixed(2);
const parseMoney = (amount: PlaynGoMoney): Money => Math.round(Number(amount) * 100);

export type AuthenticatedRequest = {
  accessToken: string,
}

export type UserRequest = {
  externalId: string,
}

const authenticateRequest = async (request: AuthenticatedRequest): Promise<{ manufacturerId: GameProvider, ... }> => {
  const conf = find(configuration.environments, c => request.accessToken === c.accessToken);
  if (conf != null) {
    return conf;
  }
  return Promise.reject(statusCodes.STATUS_WRONGUSERNAMEPASSWORD);
};

const getPlayerId = async (request: UserRequest): Promise<{ playerId: Id, brandId: BrandId }> => {
  const tokens = request.externalId.split('_');
  if (tokens.length !== 2) {
    return Promise.reject(statusCodes.STATUS_NOUSER);
  }

  const brandId: BrandId = ((tokens[0]): any);
  const playerId: Id = +tokens[1];

  return { playerId , brandId };
};

export type AuthenticateRequest = {
  username: string,
  productId: string,
  clientIP?: IPAddress,
  contextId: string,
  language: string,
  gameId: string,
} & AuthenticatedRequest;

export type AuthenticateResponse = {
  externalId: string,
  statusMessage?: string,
  userCurrency: string,
  nickname?: string,
  country: string,
  birthdate: string,
  registration?: Date,
  language?: string,
  affiliateId?: string,
  real?: PlaynGoMoney,
  gender?: string,
  externalGameSessionId?: string,
};

const authenticate = async (request: AuthenticateRequest): Promise<AuthenticateResponse> => {
  const { manufacturerId } = await authenticateRequest(request);
  if (!validate(request.username)) {
    return Promise.reject(statusCodes.STATUS_WRONGUSERNAMEPASSWORD);
  }

  const pl = await api.getPlayerBySession(manufacturerId, request.username);
  if (pl === null) {
    return Promise.reject(statusCodes.STATUS_NOUSER);
  }
  const { player, sessions } = pl;
  const session = find(sessions, ({ type }) => type === 'ticket');

  if (session == null || moment(session.parameters.expires).isBefore(moment())) {
    return Promise.reject(statusCodes.STATUS_SESSIONEXPIRED);
  }

  if (session.parameters.gameId !== request.gameId) {
    return Promise.reject(statusCodes.STATUS_SERVICEUNAVAILABLE);
  }

  const sessionId = uuid();
  const gameSession = await api.createPlayerSession(session.sessionId, manufacturerId, 'game', sessionId, {});
  if (gameSession === null) {
    return Promise.reject(statusCodes.STATUS_SESSIONEXPIRED);
  }
  const { currencyId, languageId, countryId, dateOfBirth, createdAt, brandId, balance, id } = player;
  const userId = `${brandId}_${id}`;
  const result = {
    externalId: userId,
    userCurrency: currencyId,
    nickname: api.nickName(player),
    country: countryId,
    birthdate: dateOfBirth,
    registration: createdAt,
    language: mapLanguageId(languageId),
    affiliateId: brandId,
    real: formatMoney(balance),
    gender: 'm',
    externalGameSessionId: sessionId,
  };
  return result;
};

export type ReserveRequest = {
  productId: string,
  transactionId: string,
  real: PlaynGoMoney,
  currency: string,
  gameId: string,
  gameSessionId: string,
  contextId: string,
  roundId: string,
  externalGameSessionId?: string,
} & AuthenticatedRequest & UserRequest;

export type ReserveResponse = {
  externalTransactionId: Id,
  real?: PlaynGoMoney,
  currency?: string,
  statusMessage?: string,
};
const reserve = async (request: ReserveRequest): Promise<ReserveResponse> => {
  const {
    productId, // eslint-disable-line no-unused-vars
    transactionId,
    real,
    currency,
    gameId,
    gameSessionId, // eslint-disable-line no-unused-vars
    contextId, // eslint-disable-line no-unused-vars
    roundId,
    externalGameSessionId,
  } = request;

  const { manufacturerId } = await authenticateRequest(request);
  const { playerId, brandId } = await getPlayerId(request);

  const wdReq = {
    brandId,
    manufacturer: manufacturerId,
    closeRound: false,
    amount: parseMoney(real),
    game: gameId,
    sessionId: externalGameSessionId,
    gameRoundId: roundId,
    transactionId,
    timestamp: new Date(),
    currencyId: currency,
    wins: undefined,
  };
  const { balance, currencyId, transactionId: externalTransactionId } = await api.bet(playerId, wdReq);
  return {
    externalTransactionId,
    real: formatMoney(balance),
    currency: currencyId,
  };
};

export type ReleaseRequest = {
  productId: string,
  transactionId: string,
  real: PlaynGoMoney,
  currency: string,
  gameSessionId: string,
  contextId?: string,
  state: PlaynGoSessionState,
  totalLoss?: PlaynGoMoney,
  totalGain?: PlaynGoMoney,
  numRounds: number,
  type: PlaynGoTransactionType,
  gameId: string,
  roundId: string,
  jackpotGain: number,
  jackpotLoss: number,
  jackpotGainSeed: PlaynGoMoney,
  jackpotGainID: string,
  freegameExternalId?: string,
  turnover?: number,
  freegameFinished?: boolean,
  freegameGain?: PlaynGoMoney,
  freegameLoss?: PlaynGoMoney,
  externalGameSessionId?: string,
} & AuthenticatedRequest & UserRequest;

export type ReleaseResponse = {
  externalTransactionId?: Id,
  real: PlaynGoMoney,
  currency: string,
};

const release = async (request: ReleaseRequest): Promise<ReleaseResponse> => {
  const { manufacturerId } = await authenticateRequest(request);
  const {
    productId, // eslint-disable-line no-unused-vars
    transactionId,
    real,
    currency,
    gameSessionId, // eslint-disable-line no-unused-vars
    contextId, // eslint-disable-line no-unused-vars
    totalLoss, // eslint-disable-line no-unused-vars
    totalGain, // eslint-disable-line no-unused-vars
    numRounds, // eslint-disable-line no-unused-vars
    type,
    gameId,
    roundId,
    jackpotGain, // eslint-disable-line no-unused-vars
    jackpotLoss, // eslint-disable-line no-unused-vars
    jackpotGainSeed, // eslint-disable-line no-unused-vars
    jackpotGainID, // eslint-disable-line no-unused-vars
    freegameExternalId, // eslint-disable-line no-unused-vars
    turnover, // eslint-disable-line no-unused-vars
    freegameFinished, // eslint-disable-line no-unused-vars
    freegameGain, // eslint-disable-line no-unused-vars
    freegameLoss, // eslint-disable-line no-unused-vars
    externalGameSessionId,
  } = request;
  const { playerId, brandId } = await getPlayerId(request);

  const wins = [];
  if (type === transactionTypes.TYPE_REAL) {
    wins.push({ type: 'win', amount: parseMoney(real) });
  } else if (type === transactionTypes.TYPE_PROMOTIONAL) {
    wins.push({ type: 'freespins', amount: parseMoney(real) });
  }
  if (roundId === '0') {
    const { balance, currencyId } = await api.getBalance(playerId);
    return {
      real: formatMoney(balance),
      currency: currencyId,
    };
  }
  const depositReq = {
    brandId,
    wins,
    manufacturer: manufacturerId,
    game: gameId,
    closeRound: true,
    gameRoundId: roundId,
    transactionId,
    timestamp: new Date(),
    sessionId: externalGameSessionId,
    currencyId: currency,
    createGameRound: true,
  };
  const { balance, currencyId, transactionId: externalTransactionId } = await api.win(playerId, depositReq);
  return {
    externalTransactionId,
    real: formatMoney(balance),
    currency: currencyId,
  };
};

export type BalanceRequest = {
  productId: string,
  currency: string,
  gameId: string,
  externalGameSessionId?: string,
} & AuthenticatedRequest & UserRequest;

export type BalanceResponse = {
  real: PlaynGoMoney,
  currency: string,
};

const balance = async (request: BalanceRequest): Promise<BalanceResponse> => {
  await authenticateRequest(request);
  const { playerId } = await getPlayerId(request);
  const { balance: real, currencyId } = await api.getBalance(playerId);
  return {
    real: formatMoney(real),
    currency: currencyId,
  };
};

export type CancelReserveRequest = {
  productId: string,
  transactionId: string,
  real: PlaynGoMoney,
  currency: string,
  gameSessionId: string,
  roundId: string,
  gameId: string,
  externalGameSessionId?: string,
} & AuthenticatedRequest & UserRequest;

export type CancelReserveResponse = {
  externalTransactionId?: Id,
};

const cancelReserve = async (request: CancelReserveRequest): Promise<CancelReserveResponse> => {
  const { manufacturerId } = await authenticateRequest(request);
  const { playerId, brandId } = await getPlayerId(request);
  const {
    productId, // eslint-disable-line no-unused-vars
    transactionId,
    real,
    currency, // eslint-disable-line no-unused-vars
    gameSessionId, // eslint-disable-line no-unused-vars
    roundId,
    gameId, // eslint-disable-line no-unused-vars
    externalGameSessionId, // eslint-disable-line no-unused-vars
  } = request;
  const { transactionIds, invalidTransaction } = await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: manufacturerId,
    transactionId,
    gameRoundId: roundId,
    // currencyId: currency,
    // game: gameId,
    amount: parseMoney(real),
    timestamp: new Date(),
  });
  if (invalidTransaction || transactionIds.length === 0) {
    return {
      externalTransactionId: undefined,
    };
  }
  return {
    externalTransactionId: first(transactionIds),
  };
};

module.exports = {
  authenticate,
  balance,
  reserve,
  release,
  cancelReserve,
};
