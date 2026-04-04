/* @flow */
import type { GameEventRequest } from './types';

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const money = require('gstech-core/modules/money');
const { getPlayerId } = require('gstech-core/modules/helpers');
const { MANUFACTURER_ID } = require('./constants');
const config = require('../../../config');
const { generateSignature, getBrandConfiguration } = require('./BoomingAPI');

const configuration = config.providers.booming;

const errorResponse = (error: string, message: ?string, res: express$Response) => {
  const response = {
    error: {
      error,
      message,
    },
  };

  return res.json(response);
};

const callback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Booming callback request', { body: req.body, header: req.headers });

    const body = ((req.body: any): GameEventRequest);
    const playerIdent = getPlayerId(body.player_id);
    const player = await api.getPlayer(playerIdent.id);

    const { secret } = getBrandConfiguration(player, player.brandId);

    const nonce = req.headers['Bg-Nonce'] || req.headers['bg-nonce'];
    const maybeSignature = req.headers['Bg-Signature'] || req.headers['bg-signature'];
    const signature = generateSignature(configuration.callbackUrl, req.body, secret, nonce);

    if (signature !== maybeSignature) {
      logger.error('Booming game event authentication failed', { maybeSignature });
      return errorResponse('custom', 'Authentication failed', res);
    }

    const betRequest = {
      brandId: player.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: true,
      amount: money.parseMoney(body.bet),
      game: body.operator_data,
      useGameId: true,
      gameRoundId: `${body.session_id}_${String(body.round)}`,
      transactionId: `${body.session_id}_${String(body.round)}`,
      timestamp: new Date(),
      wins: [{ amount: money.parseMoney(body.win), type: 'win' }],
      sessionId: body.session_id,
    };

    const betResult = await api.bet(player.id, betRequest);
    const response = {
      balance: money.asFloat(betResult.balance),
    };

    logger.debug('Booming callback response', { response });
    return res.json(response);
  } catch (e) {
    if (e.code === 10004) return errorResponse('custom', 'Internal Server Error', res);
    if (e.code === 10006) return errorResponse('low_balance', undefined, res);
    if (e.code === 10008) return errorResponse('wager_limit', 'Play limit reached', res);
    if (e.code === 10009) return errorResponse('custom', 'Internal Server Error', res);

    logger.error('Booming game event failed', { request: req.body, error: e });

    return errorResponse('custom', 'Internal Server Error', res);
  }
};

const rollback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Booming rollback request', { body: req.body, header: req.headers });

    const body = ((req.body: any): GameEventRequest);
    const playerIdent = getPlayerId(body.player_id);
    const player = await api.getPlayer(playerIdent.id);
    const { secret } = getBrandConfiguration(player, player.brandId);

    const nonce = req.headers['Bg-Nonce'] || req.headers['bg-nonce'];
    const maybeSignature = req.headers['Bg-Signature'] || req.headers['bg-signature'];
    const signature = generateSignature(configuration.rollback_callback, req.body, secret, nonce);

    if (signature !== maybeSignature) {
      logger.error('Booming game event authentication failed', { maybeSignature });
      return errorResponse('custom', 'Authentication failed', res);
    }

    const cancelRequest = {
      brandId: player.brandId,
      manufacturer: MANUFACTURER_ID,
      gameRoundId: `${body.session_id}_${String(body.round)}`,
      transactionId: `${body.session_id}_${String(body.round)}`,
      timestamp: new Date(),
    };

    await api.cancelTransaction(player.id, cancelRequest);

    const balanceRes = await api.getBalance(player.id);

    const response = {
      balance: money.asFloat(balanceRes.balance),
    };

    logger.debug('Booming rollback response', { response });
    return res.json(response);
  } catch (e) {
    logger.error('Booming game event rollback failed', { request: req.body, error: e });

    return errorResponse('custom', 'Internal Server Error', res);
  }
};

module.exports = {
  callback,
  rollback,
};
