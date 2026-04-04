/* @flow */

// import type { VerifyOptionsWithAlgorithm } from 'jsonwebtoken';
import type { BetbyErrorResponse, BetbyIdentifyResponse, BetbyBetRefundResponse, BetbyBetMakeRequest, BetbyBetMakeResponse, BetbyBetCommitRequest, BetbyBetRefundRequest, BetbyBetWinRequest, BetbyBetWinResponse, BetbyBetLostRequest, BetbyBetLostResponse, BetbyBetDiscardRequest, BetbyBetRollbackRequest } from './types/types';
import type { BetbyError } from './types/errors';

const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { reportFraud } = require('gstech-core/modules/clients/backend-bonus-api');
// const money = require('gstech-core/modules/money');
const jwt = require('jsonwebtoken');
const { getExternalPlayerId, getPlayerId } = require('gstech-core/modules/helpers');
// const { v1: uuid } = require('uuid');
const errors = require('./types/errors');
const { MANUFACTURER_ID, BET_GAME_ID, OP_BET, OP_REFUND, OP_WIN, OP_LOST, OP_ROLLBACK } = require('./constants');
const config = require('../../../config');
const betbyApi = require('./api');
const testJwt = require('./types/test-data');

const configuration = config.providers.betby;

let jwtPubKey = testJwt.publicKey; // default value for tests

const MIN_ODD_TO_GET_FREE_BET = 1.75;

const errorResponse = (statusCode: number, err: BetbyError, res: express$Response) => {
  const response: BetbyErrorResponse = {
    code: err.code,
    message: err.message,
  };
  res.statusCode = statusCode;
  return res.json(response);
};

const successResponse = (statusCode: number, body: any, res: express$Response) => {
  res.statusCode = statusCode;
  return res.json(body);
};

const getPayload = (req: express$Request) => {
  try {
    const decoded = jwt.decode(req.body.payload);

    const brands = Object.keys(configuration.brands);
    brands.forEach((key) => {
      if (decoded.aud === configuration.brands[key].brandId) jwtPubKey = configuration.brands[key].pubKey;
    });

    return jwt.verify(req.body.payload, jwtPubKey, { algorithms: ['RS256'] });
  } catch (err) {
    return null;
  }
};

// API calls =============================================================================

const ping = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('betby ping access');
    const response = { timestamp: Date.now() };
    return successResponse(200, response, res);
  } catch (e) {
    logger.debug('betby ping error', e);
    return errorResponse(500, errors.BBY_500_INTERNAL_SERVER_ERROR, res);
  }
};

const identify = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('betby identify access', { body: req.query });

    const { player } = await api.getPlayerBySession(MANUFACTURER_ID, req.query.key);

    const response: BetbyIdentifyResponse = {
      user_id: getExternalPlayerId(player), // use "brandId_id" as user/player identifier
      username: player.username,
      lang: player.languageId, // language codes are equal to idefix
      currency: player.currencyId, // currency codes are equal to idefix
      balance: player.realBalance,
      feature_flags: {
        is_cashout_available: true,
        is_match_tracker_available: false,
      },
      session_id: req.query.key, // query request key field is sessionId
      odds_format: 'DECIMAL',
    };

    return successResponse(200, response, res);
  } catch (e) {
    logger.debug('betby identify error', { request: req.query, error: e });
    if (e.code === 10001 || e.code === 10004) return errorResponse(403, errors.BBY_1001_KEY_NOT_FOUND, res);
    if (e.code === 10006 || e.code === 10008 || e.code === 10009) return errorResponse(403, errors.BBY_1005_PLAYER_IS_BLOCKED, res);

    return errorResponse(403, errors.BBY_1001_KEY_NOT_FOUND, res);
  }
};

const betMake = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betMake', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetMakeRequest);
    const playerIdentifier = getPlayerId(payload.player_id);
    const balanceRes = await api.getBalance(playerIdentifier.id);
    logger.debug('betMake', { balanceRes });

    if (balanceRes.realBalance >= payload.amount) {
      const betTransactionId = `${payload.transaction.id}-bet`;

      const betRequest = {
        brandId: `${playerIdentifier.brandId}`,
        manufacturer: MANUFACTURER_ID,
        closeRound: false,
        amount: payload.amount, // both in cents
        game: BET_GAME_ID,
        gameRoundId: `${payload.betslip.id}`,
        transactionId: betTransactionId,
        timestamp: new Date(),
        wins: undefined,
        sessionId: payload.session_id,
        currencyId: payload.currency,
      };

      const betResult = await api.bet(playerIdentifier.id, betRequest);

      if (betResult.existingTransaction) {
        return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res);
      }


      try {
        if (payload.betslip.bets.length === 1 && Number(payload.betslip.bets[0].odds) >= MIN_ODD_TO_GET_FREE_BET) {
          const { bonusTemplateId, freeBet: { maxAmount } } = configuration.brands[playerIdentifier.brandId];
          // $FlowFixMe[invalid-computed-prop]
          const amount = Math.min(Number(payload.amount) / 100, maxAmount[payload.currency]);

          if (betbyApi.creditFreeSpins) {
            // eslint-disable-next-line no-plusplus
            for(let i = 0; i < 3; i++) {
              await betbyApi.creditFreeSpins(playerIdentifier.brandId, (({
                player: {
                  id: playerIdentifier.id,
                  brandId: playerIdentifier.brandId,
                  currencyId: payload.currency,
                },
                bonusCode: `${bonusTemplateId}:${amount}`,
              }): any));
            }
          }
        }
      } catch (e) {
        logger.error('Betby creditFreeSpins failed', { playerIdentifier, payload, e });
      }
      const response: BetbyBetMakeResponse = {
        id: betTransactionId, // bet_transaction_id
        ext_transaction_id: `${payload.transaction.id}`, // Betby transaction
        parent_transaction_id: betResult.transactionId.toString(), // betMakeResult transaction
        user_id: payload.player_id,
        operation: OP_BET,
        amount: payload.amount,
        currency: payload.currency,
        balance: betResult.realBalance,
      };

      return successResponse(200, response, res);
    }

    logger.warn('Betby bet make failed. not enough real balance', { playerIdentifier, payload });
    return errorResponse(400, errors.BBY_2001_NOT_ENOUGH_MONEY, res);
  } catch (e) {

    logger.error('Betby bet make API failed', { request: req.body, error: e });

    if (e.code === 10004) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // wrong SID
    if (e.code === 10006) return errorResponse(400, errors.BBY_2001_NOT_ENOUGH_MONEY, res);
    if (e.code === 10008 || e.code === 10009) return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
    if (e.code === 10010) return errorResponse(400, errors.BBY_2002_INVALID_CURRENCY, res);

    if (e.code === 10001) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter
    if (e.message.startsWith('Invalid externalPlayerId')) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter

    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
  }
};

const betCommit = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betCommit', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetCommitRequest);

    if (payload.bet_transaction_id === undefined || payload.bet_transaction_id === null) {
      return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res);
    }

    return successResponse(200, {}, res);
  } catch (e) {
    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
  }
};

const betSettlement = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betSettlement', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    return successResponse(200, {}, res);
  } catch (e) {
    logger.error('Betby settlement api failed', { request: req.body, error: e });
    return errorResponse(200, errors.BBY_100_UNKNOWN_ERROR, res); // TODO can we response  to BetBy with our internal {code:400, message:e}, more informative but security dangerous
  }
};

const betRefund = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betRefund', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetRefundRequest);
    const playerIdentifier = getPlayerId(payload.transaction.ext_player_id);


    const refundWinTransactionId = `${payload.transaction.id}-refund`; // use Betby transactionId
    const refundWinRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      createGameRound: false,
      closeRound: false,
      wins: [{ amount: payload.transaction.amount, type: 'win' }],
      game: BET_GAME_ID,
      gameRoundId: `${payload.transaction.betslip_id}`,
      transactionId: refundWinTransactionId,
      timestamp: new Date(),
      sessionId: undefined,
      currencyId: payload.transaction.currency,
    };

    const refundWinResult = await api.win(playerIdentifier.id, refundWinRequest);

    const response: BetbyBetRefundResponse = {
      id: refundWinTransactionId,
      ext_transaction_id: payload.transaction.id,
      parent_transaction_id: payload.bet_transaction_id, // or cancelResult.transactionIds[0].toString()
      user_id: payload.transaction.player_id,
      operation: OP_REFUND,
      amount: payload.transaction.amount,
      currency: payload.transaction.currency,
      balance: refundWinResult.realBalance,
    };

    return successResponse(200, response, res);
  } catch (e) {
    logger.error('Betby refund  api failed', { request: req.body, error: e });

    if (e.code === 10001) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter
    if (e.code === 10004) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // wrong SID
    if (e.code === 10010) return errorResponse(400, errors.BBY_2002_INVALID_CURRENCY, res);
    if (e.message.startsWith('Invalid externalPlayerId')) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter

    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);

  }
};

const betWin = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betWin', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetWinRequest);
    const playerIdentifier = getPlayerId(payload.transaction.ext_player_id);

    const isFreeBet = ['freebet_refund', 'freebet_freemoney', 'freebet_no_risk'].includes(payload.bonus_type);
    const winTransactionId = `${payload.transaction.id}-win`; // use Betby transactionId
    const winRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      createGameRound: false,
      closeRound: false,
      wins: [{ amount: payload.amount, type: isFreeBet ? 'freespins' : 'win' }],
      game: BET_GAME_ID,
      gameRoundId: `${payload.transaction.betslip_id}`,
      transactionId: winTransactionId,
      timestamp: new Date(),
      sessionId: undefined,
      currencyId: payload.currency,
    };

    const winResult = await api.win(playerIdentifier.id, winRequest);

    const response: BetbyBetWinResponse = {
      id: winTransactionId,
      ext_transaction_id: payload.transaction.id,
      parent_transaction_id: payload.bet_transaction_id,
      user_id: payload.transaction.ext_player_id,
      operation: OP_WIN,
      amount: payload.amount,
      currency: payload.currency,
      balance: winResult.realBalance,
    };

    return successResponse(200, response, res);
  } catch (e) {

    logger.error('Betby win api failed', { request: req.body, error: e });
    if (e.code === 10001) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter
    if (e.code === 10004) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // wrong SID
    if (e.code === 10010) return errorResponse(400, errors.BBY_2002_INVALID_CURRENCY, res);
    if (e.message.startsWith('Invalid externalPlayerId')) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter

    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
  }
};

const betLost = async (req: express$Request, res: express$Response): Promise<express$Response> => {

  try {
    const data = getPayload(req);
    logger.debug('betLost', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetLostRequest);
    const playerIdentifier = getPlayerId(payload.transaction.ext_player_id);

    const balanceRes = await api.getBalance(playerIdentifier.id);

    const lostTransactionId = `${payload.transaction.id}-lost`; // use Betby transactionId
    const response: BetbyBetLostResponse = {
      id: lostTransactionId,
      ext_transaction_id: payload.transaction.id,
      parent_transaction_id: `${payload.bet_transaction_id}`,
      user_id: payload.transaction.ext_player_id,
      operation: OP_LOST,
      balance: balanceRes.realBalance,
    };

    return successResponse(200, response, res);

  } catch (e) {
    logger.error('Betby lost api failed', { request: req.body, error: e });
    if (e.code === 10001 || e.code === 10004) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter
    if (e.code === 10010) return errorResponse(400, errors.BBY_2002_INVALID_CURRENCY, res);
    if (e.message.startsWith('Invalid externalPlayerId')) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter

    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
  }

};

const betDiscard = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betDiscard', { data });
    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload = ((data.payload: any): BetbyBetDiscardRequest);
    const playerIdentifier = getPlayerId(payload.ext_player_id);

    const discardTransactionId = `${payload.transaction_id}-bet`; // id that will be canceled

    const cancelRequest = {
      brandId: playerIdentifier.brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: discardTransactionId,
      timestamp: new Date(),
    };

    const cancelResult = await api.cancelTransaction(playerIdentifier.id, cancelRequest);

    if (!cancelResult.transactionFound) {
      logger.error('Betby discard cancel error : transactionFound', { request: req.body });
    }

    if (process.env.NODE_ENV === 'test') { // only for test purpose, Betby waiting just 200 in any case
      const balanceRes = await api.getBalance(playerIdentifier.id);
      const response = { 'real_balance': balanceRes.realBalance };
      return successResponse(200, response, res);
    }

    return successResponse(200, {}, res);
  } catch (e) {
    logger.error('Betby discard api failed', { request: req.body, error: e });
    return errorResponse(200, errors.BBY_100_UNKNOWN_ERROR, res); // TODO can we response  to BetBy with our internal {code:400, message:e}, more informative but security dangerous
  }
};

const betRollback = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const data = getPayload(req);
    logger.debug('betRollback', { data });

    if (!data) {
      return errorResponse(400, errors.BBY_2005_INVALID_JWT_TOKEN, res);
    }

    const payload: BetbyBetRollbackRequest = (data.payload: any);
    const playerIdentifier = getPlayerId(payload.transaction.ext_player_id);
    const balanceBefore = await api.getBalance(playerIdentifier.id);

    try {
      if (payload.parent_transaction_id.indexOf('-lost') < 0) {
        const cancelRequest = {
          brandId: playerIdentifier.brandId,
          manufacturer: MANUFACTURER_ID,
          transactionId: payload.parent_transaction_id,
          timestamp: new Date(),
        };

        const cancelResult = await api.cancelTransaction(playerIdentifier.id, cancelRequest);

        if (!cancelResult.transactionFound) {
          return errorResponse(400, errors.BBY_2003_PARENT_TRANSACTION_NOT_FOUND, res);
        }
      }

      const balanceRes = await api.getBalance(playerIdentifier.id);
      const refundTransactionId = `${payload.transaction.id}-rollback`;

      const response = {
        id: refundTransactionId,
        ext_transaction_id: payload.transaction.id,
        parent_transaction_id: payload.parent_transaction_id,
        user_id: payload.transaction.ext_player_id,
        operation: OP_ROLLBACK,
        amount: payload.transaction.amount,
        currency: payload.transaction.currency,
        balance: balanceRes.realBalance,
      };

      return successResponse(200, response, res);
    } catch (e) {

      if (e.code === '23514') {
        const response = {
          id: `${payload.transaction.id}-rollback`,
          ext_transaction_id: payload.transaction.id,
          parent_transaction_id: payload.parent_transaction_id,
          user_id: payload.transaction.ext_player_id,
          operation: OP_ROLLBACK,
          amount: payload.transaction.amount,
          currency: payload.transaction.currency,
          balance: balanceBefore.realBalance, // return real balance
        };

        logger.error('betRollback NEGATIVE_BALANCE', { response });
        const player = await api.getPlayer(playerIdentifier.id);
        await reportFraud(playerIdentifier.brandId, playerIdentifier.id, {
          username: player.username,
          fraudKey: 'rollback_insufficient_balance',
          fraudId: payload.transaction.id,
        });

        return successResponse(200, response, res);
      }

      logger.error('Betby bet rollback API failed', { request: req.body, error: e });

      if (e.code === 10004) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // wrong SID
      if (e.code === 10006) return errorResponse(400, errors.BBY_2001_NOT_ENOUGH_MONEY, res);
      if (e.code === 10010) return errorResponse(400, errors.BBY_2002_INVALID_CURRENCY, res);

      if (e.code === 10001) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter
      if (e.message.startsWith('Invalid externalPlayerId')) return errorResponse(400, errors.BBY_2004_BAD_REQUEST, res); // invalid parameter

      return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
    }
  } catch (e) {
    logger.error('Betby bet rollback API failed', { request: req.body, error: e });
    return errorResponse(400, errors.BBY_100_UNKNOWN_ERROR, res);
  }
};

module.exports = {
  ping,
  identify,
  betMake,
  betCommit,
  betSettlement,
  betRefund,
  betWin,
  betLost,
  betDiscard,
  betRollback,
};
