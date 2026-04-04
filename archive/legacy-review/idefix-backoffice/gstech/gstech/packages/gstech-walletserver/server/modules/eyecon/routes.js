/* @flow */
import type { PlayerIdentifier } from 'gstech-core/modules/types/player';
import type { Win } from 'gstech-core/modules/clients/backend-wallet-api';
import type { EYERequestType, EYEBetRequest, EYEWinRequest, EYECancelRequest } from './types';

const querystring = require('querystring');
const moment = require('moment-timezone');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getPlayerId } = require('gstech-core/modules/helpers');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.eyecon;

const handleError = (error: number, res: express$Response): express$Response => {
  const result = querystring.stringify({
    status: 'invalid',
    error,
  });
  return res.send(result);
};

const balanceCheck = async (player: PlayerIdentifier) => {
  const balance = await api.getBalance(player.id);

  return {
    status: 'ok',
    bal: money.asFloat(balance.balance),
  };
};

const bet = async (player: PlayerIdentifier, request: EYEBetRequest) => {
  const betRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    closeRound: false,
    amount: money.parseMoney(request.wager),
    game: request.gameid,
    gameRoundId: request.round,
    transactionId: request.ref,
    timestamp: new Date(),
    wins: undefined,
    sessionId: request.guid,
    currencyId: request.cur,
  };

  const betResult = await api.bet(player.id, betRequest);

  if (betResult.existingTransaction) {
    logger.debug('Bet already exists', { betResult });

    if (betResult.ops && betResult.ops[0] && betResult.ops[0].amount === 0) {
      return {
        status: 'invalid',
        error: 8,
      };
    }
    const balance = await api.getBalance(player.id);
    return {
      status: 'ok',
      bal: money.asFloat(balance.balance),
    };
  }

  return {
    status: 'ok',
    bal: money.asFloat(betResult.balance),
  };
};

const createWins = (request: EYEWinRequest): Win[] => {
  const result = [];
  const win = money.parseMoney(request.win);
  const jackpot = money.parseMoney(request.jpwin);

  result.push({ amount: win - jackpot, type: 'win' });
  if (jackpot > 0) {
    result.push({ amount: jackpot, type: 'jackpot' });
  }

  return result;
};

const win = async (player: PlayerIdentifier, request: EYEWinRequest) => {
  const winRequest = {
    brandId: player.brandId,
    wins: createWins(request),
    manufacturer: MANUFACTURER_ID,
    game: request.gameid,
    createGameRound: false,
    closeRound: true,
    gameRoundId: request.round,
    transactionId: request.ref,
    timestamp: new Date(),
    sessionId: request.guid,
    currencyId: request.cur,
  };

  const winResult = await api.win(player.id, winRequest);

  if (winResult.existingTransaction) {
    const balance = await api.getBalance(player.id);
    return {
      status: 'ok',
      bal: money.asFloat(balance.balance),
    };
  }

  return {
    status: 'ok',
    bal: money.asFloat(winResult.balance),
  };
};

const rollback = async (player: PlayerIdentifier, request: EYEBetRequest) => {
  const cancelRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    transactionId: request.ref,
    gameRoundId: request.round,
    amount: money.parseMoney(request.win),
    timestamp: new Date(),
    currencyId: request.cur,
  };

  await api.cancelTransaction(player.id, cancelRequest);
  const balance = await api.getBalance(player.id);

  return {
    status: 'ok',
    bal: money.asFloat(balance.balance),
  };
};

const cancel = async (player: PlayerIdentifier, request: EYECancelRequest) => {
  const cancelRequest = {
    brandId: player.brandId,
    manufacturer: MANUFACTURER_ID,
    transactionId: request.cancelref,
    gameRoundId: request.round,
    amount: money.parseMoney(request.cancelwager),
    timestamp: new Date(),
    currencyId: request.cur,
  };

  const cancelResult = await api.cancelTransaction(player.id, cancelRequest);

  if (!cancelResult.transactionFound) {
    const betRequest = {
      brandId: player.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: true,
      amount: 0,
      game: request.gameid,
      gameRoundId: request.round,
      transactionId: request.cancelref,
      timestamp: new Date(),
      wins: undefined,
      sessionId: request.guid,
      currencyId: request.cur,
    };

    const betResult = await api.bet(player.id, betRequest);

    logger.debug('No transaction to cancel. Creating pseudo bet.', { cancelResult, betRequest, betResult });
  }

  const balance = await api.getBalance(player.id);

  return {
    status: 'ok',
    bal: money.asFloat(balance.balance),
  };
};

const process = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Eyecon Back End API request', req.query);

    const { accessid } = req.query;
    if (!accessid || accessid.trim() === '') {
      logger.error('Missing accessid', { accessid });
      return handleError(1, res);
    }

    if (accessid !== configuration.accessid) {
      logger.error('Unknown accessid', { accessid });
      return handleError(2, res);
    }

    const playerCheck = await api.getPlayerBySession('EYE', req.query.guid);
    if (!playerCheck || playerCheck.sessions.length === 0 || moment(playerCheck.sessions[0].parameters.expires).isBefore(moment())) {
      return handleError(12, res);
    }

    await api.updatePlayerSession(playerCheck.sessions[0].sessionId, 'EYE', {
      expires: moment().add(15, 'minutes'),
    });

    let player;
    try {
      player = getPlayerId(req.query.uid);
    } catch (e) {
      return handleError(6, res);
    }

    const request: any = { ...req.query };
    const type: EYERequestType = (req.query.type: any);
    let result;
    switch (type) {
      case 'BALANCE_CHECK':
        result = await balanceCheck(player);
        break;
      case 'BET':
        result = await bet(player, request);
        break;
      case 'LOSE':
        result = await win(player, request);
        break;
      case 'WIN':
        result = await win(player, request);
        break;
      case 'JACKPOT_WIN':
        result = await win(player, request);
        break;
      case 'FEATURE_WIN':
        result = await win(player, request);
        break;
      case 'ROLLBACK':
        result = await rollback(player, request);
        break;
      case 'CANCEL_BET':
        result = await cancel(player, request);
        break;
      case 'RESEND':
        result = await win(player, request);
        break;
      case 'FREE_SPIN':
        result = await win(player, request);
        break;
      default:
        logger.error(`Eyecon Back End API unsupported request type: ${type}`);
        return handleError(1, res);
    }

    logger.debug('Eyecon Back End API response', result);
    return res.send(querystring.stringify(result));
  } catch (e) {
    if (e.code === 10006) return handleError(13, res);
    if (e.code === 10004) return handleError(12, res);
    if (e.code === 10008) return handleError(1, res);
    if (e.code === 10009) return handleError(1, res);

    logger.error('Eyecon Back End API request error', { request: req.query, error: e });

    return handleError(1, res);
  }
};

module.exports = {
  process,
};
