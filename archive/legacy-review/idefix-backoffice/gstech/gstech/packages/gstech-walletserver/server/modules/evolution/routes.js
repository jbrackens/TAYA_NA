/* @flow */

import type { CheckUserRequest, CheckUserResponse, BalanceRequest, StandardResponse, DebitRequest, CreditRequest, CancelRequest } from './types';

const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getPlayerId } = require('gstech-core/modules/helpers');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');

const configuration = config.providers.evolution;

const standardResponse = (status: string, res: express$Response) => {
  const response: StandardResponse = {
    status,
    uuid: uuid(),
  };

  return res.json(response);
};

const checkToken = (authToken: string): boolean => (authToken !== undefined && authToken === configuration.authToken);

const check = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution check', { body: req.body });

    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): CheckUserRequest);

    const playerIdentifier = getPlayerId(body.userId);
    await api.getPlayer(playerIdentifier.id);

    const response: CheckUserResponse = {
      status: 'OK',
      sid: body.sid,
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    logger.error('Evolution check api failed', { request: req.body, error: e });

    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId')) return standardResponse('INVALID_PARAMETER', res);

    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const balance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution balance', { body: req.body });

    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): BalanceRequest);
    await api.getPlayerBySession('EVO', body.sid);

    const playerIdentifier = getPlayerId(body.userId);
    const balanceRes = await api.getBalance(playerIdentifier.id);

    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(balanceRes.realBalance),
      bonus: money.formatMoney(balanceRes.bonusBalance),
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return standardResponse('INVALID_SID', res);

    logger.error('Evolution balance api failed', { request: req.body, error: e });

    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId')) return standardResponse('INVALID_PARAMETER', res);

    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const debit = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution debit', { body: req.body });

    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): DebitRequest);
    await api.getPlayerBySession('EVO', body.sid);

    const playerIdentifier = getPlayerId(body.userId);
    const balanceRes = await api.getBalance(playerIdentifier.id);

    if (balanceRes.realBalance < money.parseMoney(body.transaction.amount)) {
      const response: StandardResponse = {
        status: 'INSUFFICIENT_FUNDS',
        balance: money.formatMoney(balanceRes.realBalance),
        bonus: money.formatMoney(balanceRes.bonusBalance),
        uuid: uuid(),
      };

      return res.json(response);
    }

    const betRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: money.parseMoney(body.transaction.amount),
      game: body.game.type,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      transactionId: body.transaction.id,
      timestamp: new Date(),
      wins: undefined,
      sessionId: body.sid,
      currencyId: body.currency,
    };

    const betResult = await api.bet(playerIdentifier.id, betRequest);

    if (betResult.existingTransaction) {
      const response: StandardResponse = {
        status: 'BET_ALREADY_EXIST',
        uuid: uuid(),
      };

      return res.json(response);
    }

    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(betResult.realBalance),
      bonus: money.formatMoney(betResult.bonusBalance),
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return standardResponse('INVALID_SID', res);
    if (e.code === 10006) return standardResponse('INSUFFICIENT_FUNDS', res);
    if (e.code === 10008) return standardResponse('UNKNOWN_ERROR', res);
    if (e.code === 10009) return standardResponse('UNKNOWN_ERROR', res);

    logger.error('Evolution debit api failed', { request: req.body, error: e });

    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId')) return standardResponse('INVALID_PARAMETER', res);

    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const credit = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution credit', { body: req.body });

    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): CreditRequest);
    await api.getPlayerBySession('EVO', body.sid);

    const playerIdentifier = getPlayerId(body.userId);

    const winRequest = {
      brandId: playerIdentifier.brandId,
      wins: [{ amount: money.parseMoney(body.transaction.amount), type: 'win' }],
      manufacturer: MANUFACTURER_ID,
      game: body.game.type,
      createGameRound: false,
      closeRound: true,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      transactionId: body.transaction.id,
      timestamp: new Date(),
      sessionId: body.sid,
      currencyId: body.currency,
    };

    const winResult = await api.win(playerIdentifier.id, winRequest);

    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(winResult.realBalance),
      bonus: money.formatMoney(winResult.bonusBalance),
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return standardResponse('INVALID_SID', res);

    logger.error('Evolution credit api failed', { request: req.body, error: e });

    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId')) return standardResponse('INVALID_PARAMETER', res);

    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const cancel = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution cancel', { body: req.body });

    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): CancelRequest);
    await api.getPlayerBySession('EVO', body.sid);

    const playerIdentifier = getPlayerId(body.userId);

    const cancelRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: body.transaction.id,
      gameRoundId: `${playerIdentifier.id}-${body.game.id}`,
      amount: money.parseMoney(body.transaction.amount),
      timestamp: new Date(),
      currencyId: body.currency,
    };

    await api.cancelTransaction(playerIdentifier.id, cancelRequest);
    const balanceRes = await api.getBalance(playerIdentifier.id);

    const response: StandardResponse = {
      status: 'OK',
      balance: money.formatMoney(balanceRes.realBalance),
      bonus: money.formatMoney(balanceRes.bonusBalance),
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return standardResponse('INVALID_SID', res);

    logger.error('Evolution cancel api failed', { request: req.body, error: e });

    if (e.code === 10001) return standardResponse('INVALID_PARAMETER', res);
    if (e.message.startsWith('Invalid externalPlayerId')) return standardResponse('INVALID_PARAMETER', res);

    return standardResponse('UNKNOWN_ERROR', res);
  }
};

const sid = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('evolution sid method', { body: req.body });
    if (!checkToken(req.query.authToken)) {
      logger.error('Evolution invalid authToken', { query: req.query, body: req.body });
      return standardResponse('INVALID_TOKEN_ID', res);
    }

    const body = ((req.body: any): CheckUserRequest);

    let email;
    let password;
    if (body.userId === 'LD_3000400') {
      email = 'evolution-eur@luckydino.com';
      password = '#Pf#uF?Gas?Us7pD';
    }

    if (body.userId === 'LD_3000401') {
      email = 'evolution-usd@luckydino.com';
      password = '#Pf#uF?Gas?Us7pD';
    }

    const playerIdentifier = getPlayerId(body.userId);
    const token = config.api.backend.staticTokens[(playerIdentifier.brandId: any)];
    const { data: loginResponse } = await axios.request({
      method: 'POST',
      url: `${config.api.backend.url}/api/LD/v1/login`,
      data: {
        email, password, ipAddress: '94.222.17.20', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
      },
      headers: { 'X-Token': token },
    });

    logger.debug('loginResponse', { loginResponse });

    const { data: launchGameResponse } = await axios.request({
      method: 'POST',
      url: `${config.api.backend.url}/api/LD/v1/game/29`,
      data: { parameters: {} },
      headers: { Authorization: `Token ${loginResponse.token}`, 'X-Token': token },
    });

    logger.debug('launchGameResponse', { launchGameResponse });

    const response: CheckUserResponse = {
      status: 'OK',
      sid: launchGameResponse.sessionId,
      uuid: uuid(),
    };

    return res.json(response);
  } catch (e) {
    logger.error('Evolution sid api failed', { request: req.body, error: e });
    return standardResponse('UNKNOWN_ERROR', res);
  }
};

module.exports = {
  check,
  balance,
  debit,
  credit,
  cancel,
  sid,
};
