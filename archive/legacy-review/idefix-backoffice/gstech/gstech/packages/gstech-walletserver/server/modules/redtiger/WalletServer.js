/* @flow */
import type { AuthRequest, AuthResponse, StakeRequest, StakeResponse, PayoutRequest, PayoutResponse, RefundRequest, RefundResponse, ErrorResponse, ErrorInfo } from './types';

const { Router } = require('express');
const { axios } = require('gstech-core/modules/axios');
const bodyParser = require('body-parser');
const logger = require('gstech-core/modules/logger');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const { errors: backendErrors } = require('gstech-core/modules/clients/backend-wallet-api');
const { errors } = require('./types');
const schemas = require('./joi');
const config = require('../../../config');
const { MANUFACTURER_ID } = require('./constants');

const configuration = config.providers.redtiger;
const router: express$Router<> = Router();  

const formatMoney = (amount: Money): string => (amount / 100).toFixed(2);
const parseMoney = (amount: string): Money => Number(amount) * 100;

const createErrorResponse = (error: ErrorInfo, res: express$Response) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error,
  };
  logger.debug('RedTiger error', errorResponse);
  res.status(500).json(errorResponse);
};

const throwError = (info: ErrorInfo) => {
  const error: any = new Error();
  error.code = info.code;

  throw error;
};

const handleError = (e: any, res: express$Response) => {
  switch (e.code) {
    case errors.INVALID_INPUT.code:
      return createErrorResponse(errors.INVALID_INPUT, res);
    case errors.NOT_AUTHORIZED.code:
      return createErrorResponse(errors.NOT_AUTHORIZED, res);
    case backendErrors.SESSION_NOT_ACTIVE.code:
      return createErrorResponse(errors.NOT_AUTHORIZED, res);
    case backendErrors.GAME_NOT_FOUND.code:
      return createErrorResponse(errors.INVALID_INPUT, res);
    case backendErrors.PLAYER_NOT_FOUND.code:
      return createErrorResponse(errors.USER_NOT_FOUND, res);
    case backendErrors.BET_FAILED_NO_BALANCE.code:
      return createErrorResponse(errors.INSUFFICIENT_FUNDS, res);
    case backendErrors.PLAY_LIMIT_REACHED.code:
      return createErrorResponse(errors.INSUFFICIENT_FUNDS, res);
    case backendErrors.PLAY_BLOCKED.code:
      return createErrorResponse(errors.BANNED_USER, res);
    case backendErrors.BET_FAILED.code:
      return createErrorResponse(errors.INVALID_INPUT, res);
    case backendErrors.WIN_FAILED.code:
      return createErrorResponse(errors.INVALID_INPUT, res);
    case backendErrors.CANCEL_FAILED.code:
      return createErrorResponse(errors.INVALID_INPUT, res);
    case backendErrors.INVALID_CURRENCY.code:
      return createErrorResponse(errors.INVALID_USER_CURRENCY, res);
    default:
      logger.error('RedTiger error: ', e);
      return createErrorResponse(errors.INTERNAL_SERVER_ERROR, res);
  }
};

const getPlayerId = (res: express$Response, userId: string) => {
  const tokens = (userId || '').split('_');
  if (tokens.length !== 2 || isNaN(tokens[1])) {
    throwError(errors.NOT_AUTHORIZED);
  }

  const [brandId, playerId] = tokens;
  return { brandId, playerId: Number(playerId) };
};

const isSchemaValid = function identity<T>(
  res: express$Response,
  body: mixed,
  schema: Joi$Schema<T>,
  options: Joi$BaseValidationOptions = {},
): T | any {
  const { error, value } = schema.validate(body, { ...options, abortEarly: false });

  if (error) {
    logger.error('Invalid RedTiger request', error);
    throwError(errors.INVALID_INPUT);
  }

  return value;
};


router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const key = authHeader.replace('Basic ', '');
    if (key === configuration.apiKey) {
      next();
      return;
    }
  }
  createErrorResponse(errors.API_AUTHENTICATION_ERROR, res);
});

// dirty hack until red tiger fixes its problems
let prvPlayer;
let swap: boolean = false;
if (!config.isProduction) {
  router.post('/session', async (req: express$Request, res: express$Response) => {
    swap = !swap;
    if (swap) {
      prvPlayer = (await axios.request({
        method: 'POST',
        url: `${config.api.backend.url}/api/v1/test/init-session`,
        data:
        {
          manufacturer: 'RTG',
          initialBalance: 100000,
        },
      })).data;
    }

    const response = {
      success: true,
      result: {
        token: prvPlayer.sessionId,
        userId: `${prvPlayer.player.brandId}_${prvPlayer.player.id}`,
      },
    };

    res.json(response);
  });
}

router.use(bodyParser.json());

router.use((req: express$Request, res: express$Response, next: express$NextFunction) => {
  logger.debug('RedTiger request: ', JSON.stringify(req.body));
  next();
});

router.post('/auth', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: AuthRequest = isSchemaValid(res, req.body, schemas.authRequestSchema);
    const { player } = await api.getPlayerBySession('RTG', body.token);
    const response: AuthResponse = {
      success: true,
      result: {
        token: body.token,
        userId: `${player.brandId}_${player.id}`,
        currency: player.currencyId,
        country: player.countryId,
        language: player.languageId,
        casino: body.casino,
        balance: {
          cash: formatMoney(player.realBalance + player.bonusBalance),
          bonus: '0.00',
        },
      },
    };
    logger.debug('RedTiger auth', req.body, response);
    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/stake', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: StakeRequest = isSchemaValid(res, req.body, schemas.stakeRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const betRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: parseMoney(body.transaction.stake),
      game: body.game.key,
      gameRoundId: String(body.round.id),
      transactionId: body.transaction.id,
      timestamp: new Date(),
      wins: undefined,
      sessionId: body.token,
      currencyId: body.currency,
    };

    const betResult = await api.bet(playerId, betRequest);

    if (betResult.existingTransaction) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: StakeResponse = {
      success: true,
      result: {
        token: body.token,
        id: betResult.transactionId,
        currency: body.currency,
        stake: {
          cash: body.transaction.stake,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(betResult.realBalance + betResult.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/payout', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: PayoutRequest = isSchemaValid(res, req.body, schemas.payoutRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const token = body.token === configuration.reconToken ? undefined : body.token;
    if (token) {
      await api.getPlayerBySession('RTG', token);
    }

    const wins = [{
      amount: parseMoney(body.transaction.details.game),
      type: 'win',
    }];

    if (Number(body.transaction.details.jackpot) > 0) {
      wins.push({
        amount: parseMoney(body.transaction.details.jackpot),
        type: 'pooled_jackpot',
      });
    }

    const winRequest = {
      brandId,
      wins,
      manufacturer: MANUFACTURER_ID,
      game: body.game.key,
      createGameRound: false,
      closeRound: body.round.ends,
      gameRoundId: String(body.round.id),
      transactionId: body.transaction.id,
      timestamp: new Date(),
      sessionId: token,
      currencyId: body.currency,
    };

    const winResult = await api.win(playerId, winRequest);

    if (winResult.existingTransaction) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: PayoutResponse = {
      success: true,
      result: {
        token: body.token,
        id: winResult.transactionId,
        currency: body.currency,
        payout: {
          cash: body.transaction.payout,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(winResult.realBalance + winResult.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/refund', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: RefundRequest = isSchemaValid(res, req.body, schemas.refundRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const cancelRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: String(body.transaction.id),
      gameRoundId: String(body.round.id),
      amount: parseMoney(body.transaction.stake),
      timestamp: new Date(),
      currencyId: body.currency,
    };

    const cancelResult = await api.cancelTransaction(playerId, cancelRequest);
    const balance = await api.getBalance(playerId);

    if (!cancelResult.transactionFound) {
      createErrorResponse(errors.TRANSACTION_NOT_FOUND, res);
      return;
    }

    if (cancelResult.alreadyCancelled) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: RefundResponse = {
      success: true,
      result: {
        token: body.token,
        id: cancelResult.transactionFound ? String(cancelResult.transactionIds[0]) : '',
        currency: body.currency,
        stake: {
          cash: body.transaction.stake,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(balance.realBalance + balance.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/promo/buyin', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: StakeRequest = isSchemaValid(res, req.body, schemas.stakeRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const betRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: 0,
      game: body.game.key,
      gameRoundId: String(body.round.id),
      transactionId: body.transaction.id,
      timestamp: new Date(),
      wins: undefined,
      sessionId: body.token,
      currencyId: body.currency,
    };

    const betResult = await api.bet(playerId, betRequest);

    if (betResult.existingTransaction) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: StakeResponse = {
      success: true,
      result: {
        token: body.token,
        id: betResult.transactionId,
        currency: body.currency,
        stake: {
          cash: body.transaction.stake,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(betResult.realBalance + betResult.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/promo/settle', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: PayoutRequest = isSchemaValid(res, req.body, schemas.payoutRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const token = body.token === configuration.reconToken ? undefined : body.token;
    if (token) {
      await api.getPlayerBySession('RTG', token);
    }
    const winRequest = {
      brandId,
      wins: [{ amount: parseMoney(body.transaction.payout), type: 'freespins' }],
      manufacturer: MANUFACTURER_ID,
      game: body.game.key,
      createGameRound: true,
      closeRound: body.round.ends,
      gameRoundId: String(body.round.id),
      transactionId: body.transaction.id,
      timestamp: new Date(),
      sessionId: token,
      currencyId: body.currency,
    };

    const winResult = await api.win(playerId, winRequest);

    if (winResult.existingTransaction) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: PayoutResponse = {
      success: true,
      result: {
        token: body.token,
        id: winResult.transactionId,
        currency: body.currency,
        payout: {
          cash: body.transaction.payout,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(winResult.realBalance + winResult.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

router.post('/promo/refund', async (req: express$Request, res: express$Response, next: express$NextFunction) => { // eslint-disable-line no-unused-vars
  try {
    const body: RefundRequest = isSchemaValid(res, req.body, schemas.refundRequestSchema);
    const { brandId, playerId } = getPlayerId(res, body.userId);
    const cancelRequest = {
      brandId,
      manufacturer: MANUFACTURER_ID,
      transactionId: String(body.transaction.id),
      gameRoundId: String(body.round.id),
      amount: parseMoney(body.transaction.stake),
      timestamp: new Date(),
      currencyId: body.currency,
    };

    const cancelResult = await api.cancelTransaction(playerId, cancelRequest);
    const balance = await api.getBalance(playerId);

    if (!cancelResult.transactionFound) {
      createErrorResponse(errors.TRANSACTION_NOT_FOUND, res);
      return;
    }

    if (cancelResult.alreadyCancelled) {
      createErrorResponse(errors.DUPLICATED_TRANSACTION, res);
      return;
    }

    const response: RefundResponse = {
      success: true,
      result: {
        token: body.token,
        id: cancelResult.transactionFound ? String(cancelResult.transactionIds[0]) : '',
        currency: body.currency,
        stake: {
          cash: body.transaction.stake,
          bonus: '0.00',
        },
        balance: {
          cash: formatMoney(balance.realBalance + balance.bonusBalance),
          bonus: '0.00',
        },
      },
    };

    res.json(response);
  } catch (e) {
    handleError(e, res);
  }
});

module.exports = router;
