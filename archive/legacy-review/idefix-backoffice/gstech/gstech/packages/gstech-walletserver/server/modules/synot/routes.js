/* @flow */
import type { GetSessionRequest, GetSessionResponse, GetBalanceRequest, GetBalanceResponse, BetRequest, BetResponse, WinRequest, WinResponse, RollbackRequest, RollbackResponse } from './types';

const crypto = require('crypto');
const moment = require('moment-timezone');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getExternalPlayerId, getPlayerId } = require('gstech-core/modules/helpers');
const config = require('../../../config');
const { MANUFACTURER_ID } = require('./constants');

const configuration = config.providers.synot;

const signBody = function func<T: Object>(body: T): T & { signature: string } {
  const sortedKeys = Object.keys(body).sort();
  const sortedValues = sortedKeys.map(key => body[key]);
  const values = sortedValues.join('|');

  logger.debug('signBody', { sortedKeys, sortedValues, values });
  const signedBody = {
    ...body,
    signature: crypto.createHmac('sha256', configuration.api.secretKey).update(values).digest('hex'),
  };

  return signedBody;
};

const errorResponse = (code: ?number, message: ?string, res: express$Response) => {
  const response = signBody({
    code: code || 3000,
    message: message || 'Internal error',
  });

  return res.status(500).json(response);
};

const getSession = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Synot getSession request', { body: req.body });
    const body = ((req.body: any): GetSessionRequest);

    const maybeSignature = body.signature;
    delete body.signature;
    const sgn = signBody(body);
    if (sgn.signature !== maybeSignature) {
      logger.warn('Synot invalid signature', maybeSignature);
      return errorResponse(3004, 'Invalid signature.', res);
    }

    const { player } = await api.getPlayerBySession('SYN', body.token);
    await api.updatePlayerSession(body.token, 'SYN', {
      expires: moment().add(20, 'minutes'),
    });

    const response: GetSessionResponse = signBody({
      // $FlowFixMe - this should get fixed once Player types are matched
      playerId: getExternalPlayerId(player),
      playerName: player.username,
      language: player.languageId,
      currency: player.currencyId,
      realBalance: money.formatMoney(player.realBalance),
      bonusBalance: money.formatMoney(player.bonusBalance),
      exitUrl: '',
      historyUrl: '',
      checkStart: '',
      checkInterval: '',
      token: body.token,
      requestId: body.requestId,
    });

    logger.debug('Synot getSession response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse(3005, 'Invalid token.', res);

    logger.error('Synot getSession request failed', { body: req.body, error: e });

    return errorResponse(3000, 'Internal Server Error', res);
  }
};

const getBalance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Synot getBalance request', { body: req.body });
    const body = ((req.body: any): GetBalanceRequest);

    const maybeSignature = body.signature;
    delete body.signature;
    const sgn = signBody(body);
    if (sgn.signature !== maybeSignature) {
      return errorResponse(3004, 'Invalid signature.', res);
    }

    await api.getPlayerBySession('SYN', body.token);
    await api.updatePlayerSession(body.token, 'SYN', {
      expires: moment().add(20, 'minutes'),
    });

    const playerIdentifier = getPlayerId(body.playerId);
    const balance = await api.getBalance(playerIdentifier.id);

    const response: GetBalanceResponse = signBody({
      realBalance: money.formatMoney(balance.realBalance),
      bonusBalance: money.formatMoney(balance.bonusBalance),
      requestId: body.requestId,
    });

    logger.debug('Synot getBalance response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse(3005, 'Invalid token.', res);

    logger.error('Synot getBalance request failed', { body: req.body, error: e });

    return errorResponse(3000, 'Internal Server Error', res);
  }
};

const bet = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Synot bet request', { body: req.body });
    const body = ((req.body: any): BetRequest);
    const maybeSignature = body.signature;
    delete body.signature;
    const sgn = signBody(body);
    if (sgn.signature !== maybeSignature) {
      return errorResponse(3004, 'Invalid signature.', res);
    }

    await api.getPlayerBySession('SYN', body.token);
    await api.updatePlayerSession(body.token, 'SYN', {
      expires: moment().add(20, 'minutes'),
    });

    const playerIdentifier = getPlayerId(body.playerId);

    const betRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: money.parseMoney(body.realAmount),
      game: body.gameCode,
      gameRoundId: String(body.roundId),
      transactionId: String(body.transactionId),
      timestamp: new Date(),
      wins: undefined,
      sessionId: body.token,
    };

    const betResult = await api.bet(playerIdentifier.id, betRequest);

    const response: BetResponse = signBody({
      reference: String(betResult.transactionId),
      realAmount: body.realAmount,
      bonusAmount: 0,
      realBalance: money.formatMoney(betResult.realBalance),
      bonusBalance: money.formatMoney(betResult.bonusBalance),
      requestId: body.requestId,
    });

    logger.debug('Synot bet response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10006) return errorResponse(3001, 'Not enough money.', res);
    if (e.code === 10004) return errorResponse(3005, 'Invalid token.', res);
    if (e.code === 10008) return errorResponse(3000, 'Internal Server Error', res);
    if (e.code === 10009) return errorResponse(3000, 'Internal Server Error', res);

    logger.error('Synot bet request failed', { body: req.body, error: e });

    return errorResponse(3000, 'Internal Server Error', res);
  }
};

const win = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Synot win request', { body: req.body });
    const body = ((req.body: any): WinRequest);
    const maybeSignature = body.signature;
    delete body.signature;
    const sgn = signBody(body);
    if (sgn.signature !== maybeSignature) {
      return errorResponse(3004, 'Invalid signature.', res);
    }

    if (!body.isFinal) {
      await api.getPlayerBySession('SYN', body.token);
      await api.updatePlayerSession(body.token, 'SYN', {
        expires: moment().add(20, 'minutes'),
      });
    }

    const playerIdentifier = getPlayerId(body.playerId);

    const winRequest = {
      brandId: playerIdentifier.brandId,
      wins: [{ amount: money.parseMoney(body.realAmount), type: 'win' }],
      manufacturer: MANUFACTURER_ID,
      game: body.gameCode,
      createGameRound: false,
      closeRound: body.isFinal,
      gameRoundId: String(body.roundId),
      transactionId: String(body.transactionId),
      timestamp: new Date(),
      sessionId: body.token,
    };

    const winResult = await api.win(playerIdentifier.id, winRequest);

    const response: WinResponse = signBody({
      reference: String(winResult.transactionId),
      realAmount: body.realAmount,
      bonusAmount: 0,
      realBalance: money.formatMoney(winResult.realBalance),
      bonusBalance: money.formatMoney(winResult.bonusBalance),
      requestId: body.requestId,
    });

    logger.debug('Synot win response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse(3005, 'Invalid token.', res);

    logger.error('Synot win request failed', { body: req.body, error: e });

    if (e.code === 10003) return errorResponse(3002, 'Invalid game round ID.', res);
    return errorResponse(3000, 'Internal Server Error', res);
  }
};

const rollback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Synot rollback request', { body: req.body });
    const body = ((req.body: any): RollbackRequest);
    const maybeSignature = body.signature;
    delete body.signature;
    const sgn = signBody(body);
    if (sgn.signature !== maybeSignature) {
      return errorResponse(3004, 'Invalid signature.', res);
    }

    const playerIdentifier = getPlayerId(body.playerId);

    const cancelRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: String(body.originalTransactionId),
      amount: money.parseMoney(body.realAmount),
      timestamp: new Date(),
    };
    const cancel = await api.cancelTransaction(playerIdentifier.id, cancelRequest);
    const balanceRes = await api.getBalance(playerIdentifier.id);

    const response: RollbackResponse = signBody({
      reference: String(cancel.transactionIds[0]),
      realAmount: body.realAmount,
      bonusAmount: body.bonusAmount,
      realBalance: money.formatMoney(balanceRes.realBalance),
      bonusBalance: money.formatMoney(balanceRes.bonusBalance),
      requestId: body.requestId,
    });

    logger.debug('Synot rollback response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse(3005, 'Invalid token.', res);

    logger.error('Synot rollback request failed', { body: req.body, error: e });

    return errorResponse(3000, 'Internal Server Error', res);
  }
};

module.exports = {
  signBody,
  getSession,
  getBalance,
  bet,
  win,
  rollback,
};
