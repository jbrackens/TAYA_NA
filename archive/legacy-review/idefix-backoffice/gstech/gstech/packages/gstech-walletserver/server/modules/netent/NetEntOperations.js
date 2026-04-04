/* @flow */
import type { Win } from 'gstech-core/modules/clients/backend-wallet-api';

import type { GameProvider } from 'gstech-core/modules/constants';
import type {
  GetPlayerCurrencyRequest,
  WithdrawRequest,
  DepositRequest,
  WithdrawAndDepositRequest,
  RollbackTransactionRequest,
  GetPlayerCurrencyResponse,
  GetBalanceResponse,
  WithdrawResponse,
  DepositResponse,
  WithdrawAndDepositResponse,
  NetentMoney,
} from './types';
import type { NetentConfig } from '../../types';

const moment = require('moment-timezone');
const { errors } = require('gstech-core/modules/clients/backend-wallet-api');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const {
  ERROR_AUTHENTICATION_FAILED,
  ERROR_NOT_ENOUGH_MONEY,
  ERROR_PLAYER_LIMIT_EXCEEDED,
  ERROR_ILLEGAL_CURRENCY,
  ERROR_NEGATIVE_DEPOSIT,
  ERROR_NEGATIVE_WITHDRAWAL,
} = require('./types');

const parseTimestamp = (timestamp: string) => moment.tz(timestamp, 'UTC');
const formatMoney = (amount: Money): NetentMoney => (amount / 100).toFixed(2);
const parseMoney = (amount: NetentMoney): Money => Number(amount) * 100;

const getPlayerId = async (request: {
  playerName: string,
  conf: NetentConfig,
  ...
}): Promise<{ brandId: string, playerId: Id, manufacturerId: GameProvider }> => {
  const { playerName, conf } = request;
  const userName = playerName.substring(3);
  const idPart =
    userName.indexOf('_') === -1 ? userName : userName.substring(userName.lastIndexOf('_') + 1);
  const playerId = Number(idPart);
  const brandId: any = playerName.substring(0, 2);
  if (Number.isNaN(playerId) || conf === null) {
    return Promise.reject({
      code: ERROR_AUTHENTICATION_FAILED,
      message: 'Invalid playerName',
    });
  }
  const { manufacturerId } = conf;
  if (playerId < 3000000) {
    return { playerId: playerId + conf.playerIdMapping[brandId], brandId, manufacturerId };
  }
  return { playerId, brandId, manufacturerId };
};

const getBalance = async (request: {
  currency: string,
  playerName: string,
  conf: NetentConfig,
  ...
}): Promise<GetBalanceResponse> => {
  const { playerId } = await getPlayerId(request);
  const { balance, currencyId } = await api.getBalance(playerId);
  if (request.currency !== currencyId) {
    return Promise.reject({ code: ERROR_ILLEGAL_CURRENCY });
  }
  return {
    balance: formatMoney(balance),
  };
};

const getPlayerCurrency = async (
  request: GetPlayerCurrencyRequest,
): Promise<GetPlayerCurrencyResponse> => {
  const { playerId } = await getPlayerId(request);
  const { currencyId } = await api.getPlayer(playerId);
  return {
    currencyIsoCode: currencyId,
  };
};

const handleError = (e: any): { code: number } => {
  if (e.code && e.code === errors.BET_FAILED.code) {
    return { code: ERROR_ILLEGAL_CURRENCY };
  }
  if (e.code && e.code === errors.BET_FAILED_NO_BALANCE.code) {
    return { code: ERROR_NOT_ENOUGH_MONEY };
  }
  if (e.code && e.code === errors.PLAY_LIMIT_REACHED.code) {
    return { code: ERROR_PLAYER_LIMIT_EXCEEDED };
  }
  if (e.code && e.code === errors.PLAY_BLOCKED.code) {
    return { code: ERROR_PLAYER_LIMIT_EXCEEDED };
  }
  if (e.code && e.code === errors.INVALID_CURRENCY.code) {
    return { code: ERROR_ILLEGAL_CURRENCY };
  }
  throw e;
};

const withdraw = async (request: WithdrawRequest): Promise<WithdrawResponse> => {
  const { brandId, playerId, manufacturerId } = await getPlayerId(request);
  const {
    amount,
    // bonusBet,
    currency,
    // freeRoundBet,
    transactionRef,
    gameRoundRef,
    gameId,
    reason,
    sessionId,
  } = request;

  const parsedAmount = parseMoney(amount);
  if (parsedAmount < 0) {
    return Promise.reject({ code: ERROR_NEGATIVE_WITHDRAWAL });
  }
  const wdReq = {
    brandId,
    manufacturer: manufacturerId,
    closeRound: reason === 'GAME_PLAY_FINAL',
    amount: parsedAmount,
    game: gameId,
    sessionId: sessionId === '' ? undefined : sessionId,
    gameRoundId: gameRoundRef,
    transactionId: transactionRef,
    timestamp: new Date(),
    wins: undefined,
    currencyId: currency,
  };
  try {
    const { balance, transactionId } = await api.bet(playerId, wdReq);
    return {
      balance: formatMoney(balance),
      transactionId,
      message: null,
    };
  } catch (e) {
    return Promise.reject(handleError(e));
  }
};

const createWins = (amount: NetentMoney, reason: string, jackpotAmount: NetentMoney): Win[] => {
  const result = [];
  const jackpot = parseMoney(jackpotAmount);
  if (jackpot > 0) {
    result.push({
      type: reason === 'WAGERED_BONUS' ? 'freespins' : 'win',
      amount: parseMoney(amount) - jackpot,
    });
    result.push({ type: 'jackpot', amount: jackpot });
  } else {
    result.push({
      type: reason === 'WAGERED_BONUS' ? 'freespins' : 'win',
      amount: parseMoney(amount),
    });
  }
  return result;
};

const deposit = async (request: DepositRequest): Promise<DepositResponse> => {
  const { playerId, brandId, manufacturerId } = await getPlayerId(request);
  const {
    amount,
    jackpotAmount,
    // bonusWin,
    transactionRef,
    gameRoundRef,
    gameId,
    reason,
    // source,
    startDate,
    sessionId,
    currency,
  } = request;

  const parsedAmount = parseMoney(amount);
  if (parsedAmount < 0) {
    return Promise.reject({ code: ERROR_NEGATIVE_DEPOSIT });
  }

  const depositReq = {
    brandId,
    wins: createWins(amount, reason, jackpotAmount),
    manufacturer: manufacturerId,
    game: gameId,
    createGameRound:
      reason === 'GAME_PLAY_FINAL' ||
      reason === 'WAGERED_BONUS' ||
      reason === 'CLEAR_HANGED_GAME_STATE',
    closeRound:
      reason === 'GAME_PLAY_FINAL' ||
      reason === 'WAGERED_BONUS' ||
      reason === 'CLEAR_HANGED_GAME_STATE',
    sessionId: sessionId === '' ? undefined : sessionId,
    gameRoundId: gameRoundRef,
    transactionId: transactionRef,
    timestamp: parseTimestamp(startDate),
    currencyId: currency,
  };
  try {
    const { balance, transactionId } = await api.win(playerId, depositReq);
    return {
      balance: formatMoney(balance),
      transactionId,
    };
  } catch (e) {
    return Promise.reject(handleError(e));
  }
};

const withdrawAndDeposit = async (
  request: WithdrawAndDepositRequest,
): Promise<WithdrawAndDepositResponse> => {
  const { brandId, playerId, manufacturerId } = await getPlayerId(request);
  const {
    withdraw: wdValue,
    deposit: depositValue,
    // bonusPrograms,
    // tournaments,
    // bigWin,
    jackpotAmount,
    // bonusWin,
    currency,
    transactionRef,
    gameRoundRef,
    gameId,
    reason,
    // source,
    startDate,
    sessionId,
  } = request;
  const parsedAmount = parseMoney(depositValue);
  if (parsedAmount < 0) {
    return Promise.reject({ code: ERROR_NEGATIVE_DEPOSIT });
  }

  const parsedWd = parseMoney(wdValue);
  if (parsedWd < 0) {
    return Promise.reject({ code: ERROR_NEGATIVE_WITHDRAWAL });
  }
  try {
    const { balance, transactionId } = await api.bet(playerId, {
      brandId,
      manufacturer: manufacturerId,
      game: gameId,
      closeRound: reason === 'GAME_PLAY_FINAL' || reason === 'WAGERED_BONUS',
      sessionId: sessionId === '' ? undefined : sessionId,
      gameRoundId: gameRoundRef,
      transactionId: transactionRef,
      timestamp: parseTimestamp(startDate),
      amount: parseMoney(wdValue),
      wins: createWins(depositValue, reason, jackpotAmount),
      currencyId: currency,
    });
    return {
      newBalance: formatMoney(balance),
      transactionId,
    };
  } catch (e) {
    return Promise.reject(handleError(e));
  }
};

const rollbackTransaction = async (request: RollbackTransactionRequest) => {
  const { brandId, playerId, manufacturerId } = await getPlayerId(request);
  const { transactionRef } = request;
  await api.cancelTransaction(playerId, {
    brandId,
    manufacturer: manufacturerId,
    transactionId: transactionRef,
    timestamp: new Date(),
  });
};

module.exports = {
  getBalance,
  getPlayerCurrency,
  withdraw,
  deposit,
  withdrawAndDeposit,
  rollbackTransaction,
};
