/* @flow */
import type {
  PragmaticRequest,
  AuthenticateRequest,
  BalanceRequest,
  BetRequest,
  BonusWinRequest,
  BonusWinResponse,
  RefundRequest,
  EndRoundRequest,
  AuthenticateResponse,
  BalanceResponse,
  BetResponse,
  ResultRequest,
  ResultResponse,
  EndRoundResponse,
  PragmaticMoney,
} from './types';

const first = require('lodash/fp/first');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { errors } = require('./types');

const { MANUFACTURER_ID } = require('./constants');

const formatMoney = (amount: Money): PragmaticMoney => (amount / 100).toFixed(2);
const parseMoney = (amount: PragmaticMoney): Money => Number(amount) * 100;
const parseTimestamp = (timestamp: ?string) => (timestamp != null ? new Date(Number(timestamp)) : new Date());

const getPlayerId = async (
  request: PragmaticRequest,
): Promise<{ playerId: Id, brandId: BrandId }> => {
  const tokens = request.userId.split('_');
  if (tokens.length !== 3) {
    return Promise.reject({ code: errors.PLAYER_NOT_FOUND, description: 'Player not found' });
  }
  const res = await api.getPlayerId(request.userId);
  if (res == null) {
    return Promise.reject({ code: errors.PLAYER_NOT_FOUND, description: 'Player not found' });
  }
  const { playerId, brandId } = res;
  return { playerId, brandId };
};

const balance = async (request: BalanceRequest): Promise<BalanceResponse> => {
  const { playerId } = await getPlayerId(request);
  const b = await api.getBalance(playerId);
  const { realBalance, bonusBalance, currencyId } = b;
  return {
    cash: formatMoney(realBalance),
    currency: currencyId,
    bonus: formatMoney(bonusBalance),
  };
};

const bet = async (request: BetRequest): Promise<BetResponse> => {
  const { brandId, playerId } = await getPlayerId(request);
  const {
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    // roundDetails,
  } = request;

  const wdReq = {
    brandId,
    manufacturer: MANUFACTURER_ID,
    closeRound: false,
    amount: parseMoney(amount),
    game: gameId,
    gameRoundId: roundId,
    transactionId: reference,
    timestamp: parseTimestamp(timestamp),
    wins: undefined,
    sessionId: undefined,
  };
  try {
    const { transactionId, usedBonusBalance } = await api.bet(playerId, wdReq);
    const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
    return {
      cash: formatMoney(realBalance),
      bonus: formatMoney(bonusBalance),
      transactionId,
      currency: currencyId,
      usedPromo: usedBonusBalance ? '1' : '0',
    };
  } catch (e) {
    if (e.code && e.code === 10006) {
      return Promise.reject({ error: errors.INSUFFICIENT_BALANCE, description: 'Insufficient balance' });
    }
    if (e.code && e.code === 10008) {
      return Promise.reject({ error: errors.BET_LIMIT_REACHED, description: 'Bet failed because of play limit' });
    }
    if (e.code && e.code === 10009) {
      return Promise.reject({ error: errors.BET_LIMIT_REACHED, description: 'Bet failed because of game play blocked' });
    }
    throw e;
  }
};

const creditWins = async (request: ResultRequest, type: 'win' | 'jackpot' | 'freespins'): Promise<ResultResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const {
    gameId,
    roundId,
    amount,
    reference,
    timestamp,
    // roundDetails
  } = request;

  const depositReq = {
    brandId,
    wins: [{ amount: parseMoney(amount), type }],
    manufacturer: MANUFACTURER_ID,
    game: gameId,
    createGameRound: type !== 'win',
    closeRound: type !== 'win',
    gameRoundId: roundId,
    transactionId: reference,
    timestamp: parseTimestamp(timestamp),
    sessionId: undefined,
  };
  const { transactionId } = await api.win(playerId, depositReq);
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    bonus: formatMoney(bonusBalance),
    cash: formatMoney(realBalance),
    currency: currencyId,
    transactionId,
  };
};

const bonusWin = async (request: BonusWinRequest): Promise<BonusWinResponse> => {
  const { playerId } = await getPlayerId(request);
  const { realBalance, bonusBalance, currencyId } = await api.getBalance(playerId);
  return {
    bonus: formatMoney(bonusBalance),
    cash: formatMoney(realBalance),
    currency: currencyId,
  };
};

const result = (request: ResultRequest): Promise<ResultResponse> => creditWins(request, request.bonusCode == null ? 'win' : 'freespins');
const jackpotWin = (request: ResultRequest): Promise<ResultResponse> => creditWins(request, 'jackpot');

const endRound = async (request: EndRoundRequest): Promise<EndRoundResponse> => {
  const { playerId, brandId } = await getPlayerId(request);
  const { roundId } = request;

  const closeReq = {
    brandId,
    manufacturer: MANUFACTURER_ID,
    gameRoundId: roundId,
    timestamp: new Date(),
  };
  const { realBalance, bonusBalance, currencyId } = await api.closeRound(playerId, closeReq);
  return {
    cash: formatMoney(realBalance),
    bonus: formatMoney(bonusBalance),
    currency: currencyId,
  };
};

const refund = async (request: RefundRequest): Promise<{transactionId: Id}> => {
  const { brandId, playerId } = await getPlayerId(request);
  const {
    reference,
  } = request;
  const { transactionIds } = await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: MANUFACTURER_ID,
    transactionId: reference,
    timestamp: new Date(),
  });
  return {
    transactionId: first(transactionIds),
  };
};

const authenticate = async (request: AuthenticateRequest): Promise<AuthenticateResponse> => {
  const { player } = await api.getPlayerBySession(MANUFACTURER_ID, request.token);
  if (player != null) {
    return {
      userId: player.username,
      currency: player.currencyId,
      cash: formatMoney(player.realBalance),
      bonus: formatMoney(player.bonusBalance),
      country: player.countryId,
    };
  }
  return Promise.reject({ code: errors.EXPIRED_TOKEN, description: 'Authentication failed' });
};

module.exports = {
  authenticate,
  balance,
  bet,
  result,
  bonusWin,
  jackpotWin,
  endRound,
  refund,
};
