/* @flow */
import type { TransactionRequest, RollbackRequest } from './types';

const logger = require('gstech-core/modules/logger');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { getPlayerId, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const { MANUFACTURER_ID } = require('./constants');

const errorResponse = (responseCode: string, errorDescription: string, res: express$Response, balance?: Money) => {
  const response = {
    responseCode,
    errorDescription,
    balance,
  };

  return res.status(responseCode === 'OUT_OF_MONEY' ? 200 : 500).json(response);
};

const authenticate = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Oryx authenticate request', { body: req.body, header: req.headers });

    const { token } = req.params;
    const { player } = await api.getPlayerBySession('ORX', token);
    const balanceRes = await api.getBalance(player.id);
    const { id, brandId } = player;
    const response = {
      playerId: getExternalPlayerId({ id, brandId }),
      nickname: nickName(player),
      currencyCode: player.currencyId,
      languageCode: player.languageId,
      balance: balanceRes.balance,
    };

    logger.debug('Oryx authenticate response', { response });
    return res.json(response);
  } catch (e) {
    logger.error('Oryx authenticate failed', { request: req.body, error: e });

    return errorResponse('ERROR', 'Server processing general error', res);
  }
};

const balance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Oryx balance request', { body: req.body, header: req.headers });

    const playerIdentifier = getPlayerId(req.params.playerId);
    const balanceRes = await api.getBalance(playerIdentifier.id);
    const response = {
      responseCode: 'OK',
      balance: balanceRes.balance,
    };

    logger.debug('Oryx balance response', { response });
    return res.json(response);
  } catch (e) {
    logger.error('Oryx balance failed', { request: req.body, error: e });

    return errorResponse('ERROR', 'Server processing general error', res);
  }
};

const transaction = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Oryx transaction request', { body: req.body, header: req.headers });

    const body = ((req.body: any): TransactionRequest);
    const player = getPlayerId(body.playerId);

    let result;
    if (body.bet) {
      const betRequest = {
        brandId: player.brandId,
        manufacturer: MANUFACTURER_ID,
        closeRound: body.roundAction === 'CLOSE',
        amount: body.freeRoundExternalId ? 0 : body.bet.amount,
        game: body.gameCode,
        gameRoundId: body.roundId,
        transactionId: body.bet.transactionId,
        timestamp: new Date(),
        wins: body.win ? [
          { amount: body.win.amount, type: body.freeRoundId ? 'freespins' : 'win', transactionId: body.win.transactionId },
          ...body.win.jackpotAmount ? [{ amount: body.win.jackpotAmount, type: 'jackpot' }] : [],
        ] : undefined,
        sessionId: undefined,
      };

      result = await api.bet(player.id, betRequest);
      if (result.ops && result.ops.find(o => o.type === 'cancel_bet')) {
        logger.warn('Oryx bet was already canceled');
        return errorResponse('ERROR', 'Bet was previously canceled', res);
      }
    } else if (body.win) {
      const winRequest = {
        brandId: player.brandId,
        wins: [
          { amount: body.win.amount, type: body.freeRoundId ? 'freespins' : 'win' },
          ...body.win.jackpotAmount ? [{ amount: body.win.jackpotAmount, type: 'jackpot' }] : [],
        ],
        manufacturer: MANUFACTURER_ID,
        game: body.gameCode,
        createGameRound: true,
        closeRound: body.roundAction === 'CLOSE',
        gameRoundId: body.roundId,
        transactionId: body.win.transactionId,
        timestamp: new Date(),
        sessionId: undefined,
      };

      result = await api.win(player.id, winRequest);
    } else if (body.roundAction === 'CLOSE') {
      const closeRequest = {
        brandId: player.brandId,
        manufacturer: MANUFACTURER_ID,
        gameRoundId: body.roundId,
        timestamp: new Date(),
      };

      result = await api.closeRound(player.id, closeRequest);
    } else if (body.roundAction === 'CANCEL') {
      const transactions = await api.getRoundTransactions(player.id, {
        gameRoundId: body.roundId,
        manufacturer: MANUFACTURER_ID,
        timestamp: new Date(),
      });

      if (transactions.length === 0) {
        return errorResponse('ROUND_NOT_FOUND', 'Round not found', res);
      }

      await Promise.all(transactions.map(async (t) => {
        const cancelRequest = {
          brandId: player.brandId,
          manufacturer: MANUFACTURER_ID,
          transactionId: t.externalTransactionId,
          gameRoundId: body.roundId,
          timestamp: new Date(),
        };

        await api.cancelTransaction(player.id, cancelRequest);
      }));

      result = await api.getBalance(player.id);
    }

    const response = {
      responseCode: 'OK',
      balance: result && result.balance,
    };

    logger.debug('Oryx transaction response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10006) {
      const player = getPlayerId((req.body: any).playerId);
      const balanceRes = await api.getBalance(player.id);

      return errorResponse('OUT_OF_MONEY', 'Not enough balance', res, balanceRes.balance);
    }

    if (e.code === 10004) return errorResponse('ERROR', 'Server processing general error', res);
    if (e.code === 10008) return errorResponse('GAMING_LIMITS_REACHED', 'Play limit reached', res);
    if (e.code === 10009) return errorResponse('GAMING_LIMITS_REACHED', 'Game play blocked', res);

    logger.error('Oryx transaction failed', { request: req.body, error: e });

    if (e.code === 10007) return errorResponse('ROUND_NOT_FOUND', 'Round not found', res);

    return errorResponse('ERROR', 'Server processing general error', res);
  }
};

const rollback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Oryx rollback request', { body: req.body, header: req.headers });

    const body = ((req.body: any): RollbackRequest);
    const player = getPlayerId(body.playerId);

    const cancelRequest = {
      brandId: player.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: body.transactionId,
      gameRoundId: body.roundId,
      timestamp: new Date(),
    };

    const cancelResult = await api.cancelTransaction(player.id, cancelRequest);
    if (!cancelResult.transactionFound) {
      logger.debug('Oryx rollback failed. cancel transaction id wasn\'t found');

      const betRequest = {
        brandId: player.brandId,
        manufacturer: MANUFACTURER_ID,
        closeRound: true,
        amount: 0,
        game: body.gameCode,
        gameRoundId: body.roundId || body.transactionId,
        transactionId: body.transactionId,
        timestamp: new Date(),
        wins: undefined,
        sessionId: undefined,
      };

      await api.bet(player.id, betRequest);
      await api.cancelTransaction(player.id, cancelRequest);

      return errorResponse('TRANSACTION_NOT_FOUND', 'Cancel transaction is not found', res);
    }

    const balanceRes = await api.getBalance(player.id);

    const response = {
      responseCode: 'OK',
      balance: balanceRes.balance,
    };

    logger.debug('Oryx rollback response', { response });
    return res.json(response);
  } catch (e) {
    logger.error('Oryx rollback failed', { request: req.body, error: e });

    return errorResponse('ERROR', 'Server processing general error', res);
  }
};

module.exports = {
  authenticate,
  balance,
  transaction,
  rollback,
};
