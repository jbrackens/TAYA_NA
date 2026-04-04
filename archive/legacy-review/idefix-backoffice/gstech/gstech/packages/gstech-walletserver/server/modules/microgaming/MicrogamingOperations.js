/* @flow */
import type { GameProvider } from 'gstech-core/modules/constants';
import type {
  LoginRequest,
  GetBalanceRequest,
  PlayRequest,
  AwardBonusRequest,
  EndGameRequest,
  RefreshTokenRequest,
  LoginResponse,
  GetBalanceResponse,
  PlayResponse,
  AwardBonusResponse,
  EndGameResponse,
  RefreshTokenResponse,
} from './types';


const validate = require('uuid-validate');
const moment = require('moment-timezone');
const find = require('lodash/find');
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');

const parseToken = async (request: {
  token: string,
  manufacturerId: GameProvider,
  ...
}): Promise<{
  playerId: Id,
  token: string,
  brandId: BrandId,
  sessionId: string,
  manufacturerId: GameProvider,
}> => {
  const { token, manufacturerId } = request;
  if (!validate(token)) {
    return Promise.reject({ code: '6001' });
  }
  try {
    const { player, sessions } = await api.getPlayerBySession(manufacturerId, token);

    const session = find(sessions, ({ type }) => type === 'game');
    if (session == null || moment(session.parameters.expires).isBefore(moment())) {
      return Promise.reject({ code: '6002' });
    }

    await api.updatePlayerSession(session.sessionId, manufacturerId, {
      expires: moment().add(15, 'minutes'),
    });

    return {
      token,
      manufacturerId,
      sessionId: token,
      playerId: player.id,
      brandId: player.brandId,
    };
  } catch (e) {
    logger.warn('parseToken failed', e);
    return Promise.reject({ code: '6001' });
  }
};

const parseWinRefundToken = async (request: { manufacturerId: GameProvider, token: string, offline?: 'true' | 'false', ... }) => {
  if (request.offline === 'true') {
    const { token } = request;
    const [brandId, playerId, gameId, actionId] = token.split('_'); // eslint-disable-line no-unused-vars
    return {
      token,
      manufacturerId: request.manufacturerId,
      sessionId: undefined,
      playerId: Number(playerId),
      brandId,
    };
  }
  return parseToken(request);
};

const parseEndgameToken = async (request: { manufacturerId: GameProvider, token: string, offline: 'true' | 'false', ... }) => {
  if (request.offline === 'true') {
    const { token, manufacturerId } = request; // loginname_gameid
    const [brandId, playerId, gameId] = token.split('_'); // eslint-disable-line no-unused-vars
    return {
      token,
      manufacturerId,
      playerId: Number(playerId),
      brandId,
    };
  }
  return parseToken(request);
};

const login = async (request: LoginRequest): Promise<LoginResponse> => {
  try {
    const pl = await api.getPlayerBySession(request.manufacturerId, request.token);
    if (pl === null) {
      throw new Error('Login failed');
    }

    const { player, sessions } = pl;
    const session = find(sessions, ({ type }) => type === 'ticket');
    if (session == null || moment(session.parameters.expires).isBefore(moment())) {
      return Promise.reject({ code: '6002' });
    }

    const sessionId = uuid();
    const gameSession = await api.createPlayerSession(session.sessionId, request.manufacturerId, 'game', sessionId, {
      expires: moment().add(15, 'minutes'),
    });
    if (gameSession === null) {
      return Promise.reject({ code: '6002' });
    }
    await api.expirePlayerSession(session.sessionId, request.manufacturerId);

    const { balance, brandId, currencyId, countryId, city } = await api.getPlayer(player.id);
    return {
      token: sessionId,
      loginname: `${brandId}_${player.id}`,
      currency: currencyId,
      country: countryId,
      city,
      balance,
      bonusbalance: 0,
      wallet: 'vanguard',
    };
  } catch (e) {
    logger.warn('login failed', e);
    return Promise.reject({ code: '6001' });
  }
};

const getBalance = async (request: GetBalanceRequest): Promise<GetBalanceResponse> => {
  const { playerId, token } = await parseToken(request);
  const { balance } = await api.getBalance(playerId);
  return {
    token,
    balance,
    bonusbalance: 0,
  };
};

const playBet = async (request: PlayRequest): Promise<PlayResponse> => {
  const { playerId, token, brandId, sessionId, manufacturerId } = await parseToken(request);
  const {
    gameid,
    gamereference,
    actionid,
    amount,
    finish,
    ts,
  } = request;

  logger.debug('microgaming. playBet', { request });
  const wdReq = {
    brandId,
    manufacturer: manufacturerId,
    closeRound: finish,
    amount,
    game: gamereference,
    useGameId: true,
    sessionId,
    gameRoundId: `${playerId}_${token}_${gameid}`,
    transactionId: actionid,
    timestamp: ts,
    wins: undefined,
  };
  try {
    const { balance, transactionId } = await api.bet(playerId, wdReq);
    return {
      token,
      balance,
      bonusbalance: 0,
      exttransactionid: transactionId,
    };
  } catch (e) {
    if (e.code && e.code === 10006) {
      return Promise.reject({ code: '6503' /* ERROR_NOT_ENOUGH_MONEY */ });
    }
    if (e.code && e.code === 10008) {
      return Promise.reject({ code: '6505' /* ERROR_PLAYER_LIMIT_EXCEEDED */ });
    }
    throw e;
  }
};

const playWin = async (request: PlayRequest, type: 'jackpot' | 'pooled_jackpot' | 'win'): Promise<PlayResponse> => {
  const { playerId, token, brandId, sessionId, manufacturerId } = await parseWinRefundToken(request);
  const {
    gameid,
    gamereference,
    actionid,
    amount,
    finish,
    ts,
  } = request;

  logger.debug('microgaming. playWin', { request });
  const depositReq = {
    brandId,
    wins: [{ type, amount }],
    manufacturer: manufacturerId,
    game: gamereference,
    useGameId: true,
    closeRound: finish,
    sessionId,
    gameRoundId: `${playerId}_${token}_${gameid}`,
    transactionId: actionid,
    timestamp: ts,
  };

  const { balance, transactionId } = await api.win(playerId, depositReq);
  return {
    token,
    balance,
    bonusbalance: 0,
    exttransactionid: transactionId,
  };
};

const playRefund = async (request: PlayRequest): Promise<PlayResponse> => {
  const { playerId, token, brandId, manufacturerId } = await parseWinRefundToken(request);
  const {
    gameid,
    actionid,
    amount,
    ts,
  } = request;

  logger.debug('microgaming. playRefund', { request });
  const { transactionIds, transactionFound } = await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: manufacturerId,
    transactionId: actionid,
    gameRoundId: `${playerId}_${token}_${gameid}`,
    amount,
    timestamp: ts,
  });
  const { balance } = await api.getBalance(playerId);
  return {
    token,
    balance,
    bonusbalance: 0,
    exttransactionid: transactionFound ? transactionIds[0] : 'DEBIT-NOT-RECEIVED',
  };
};

const playTransferToMgs = async (request: PlayRequest): Promise<PlayResponse> => { // eslint-disable-line no-unused-vars
  throw new Error('Tournaments not implemented');
};

const playTransferFromMgs = async (request: PlayRequest): Promise<PlayResponse> => { // eslint-disable-line no-unused-vars
  throw new Error('Tournaments not implemented');
};

const playTournamentPurhase = async (request: PlayRequest): Promise<PlayResponse> => { // eslint-disable-line no-unused-vars
  throw new Error('Tournaments not implemented');
};

const playAdmin = async (request: PlayRequest): Promise<PlayResponse> => { // eslint-disable-line no-unused-vars
  throw new Error('Admin transactions not implemented'); // Do we need this?
};

const play = async (request: PlayRequest): Promise<PlayResponse> => {
  switch (request.playtype) {
    case 'bet': return playBet(request);
    case 'win': return playWin(request, 'win');
    case 'progressivewin': return playWin(request, 'pooled_jackpot');
    case 'refund': return playRefund(request);
    case 'transfertomgs': return playTransferToMgs(request);
    case 'transferfrommgs': return playTransferFromMgs(request);
    case 'tournamentpurchase': return playTournamentPurhase(request);
    case 'admin': return playAdmin(request);
    default: throw new Error(`Invalid playtype ${request.playtype}`);
  }
};

const awardBonus = async (request: AwardBonusRequest): Promise<AwardBonusResponse> => {
  const { playerId, token } = await parseToken(request);
  const { balance } = await api.getPlayer(playerId);
  // Not implemented. Needed?
  return {
    token,
    balance,
    bonusbalance: 0,
    exttransactionid: 'DEBIT-NOT-RECEIVED',
  };
};

const endGame = async (request: EndGameRequest): Promise<EndGameResponse> => {
  const { playerId, token, brandId, manufacturerId } = await parseEndgameToken(request);
  const {
    gameid,
    ts,
  } = request;

  logger.debug('microgaming. endGame', { request });
  const closeReq = {
    brandId,
    manufacturer: manufacturerId,
    gameRoundId: `${playerId}_${token}_${gameid}`,
    timestamp: ts,
  };
  const { balance } = await api.closeRound(playerId, closeReq);
  return {
    token,
    balance,
    bonusbalance: 0,
  };
};

const refreshToken = async (request: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
  const pl = await api.getPlayerBySession(request.manufacturerId, request.token);
  if (pl === null) {
    throw new Error('Login failed');
  }

  const { sessions } = pl;
  const session = find(sessions, ({ type }) => type === 'game');
  if (session === null || session === undefined) {
    return Promise.reject({ code: '6002' });
  }
  await api.updatePlayerSession(session.sessionId, request.manufacturerId, {
    expires: moment().add(15, 'minutes'),
  });
  return {
    token: session.sessionId,
  };
};


module.exports = {
  login,
  getBalance,
  play,
  awardBonus,
  endGame,
  refreshToken,
};
