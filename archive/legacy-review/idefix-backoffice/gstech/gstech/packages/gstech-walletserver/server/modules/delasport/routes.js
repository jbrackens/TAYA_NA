/* @flow */
import type {
  MemberDetailsRequest,
  BalanceRequest,
  BetPlacedRequest,
  BetUpdatedRequest,
  BalanceUpdatedRequest,
} from './types';

const crypto = require('crypto');

const { axios } = require('gstech-core/modules/axios');
const logger = require('gstech-core/modules/logger');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { getPlayerId, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { parseMoney, formatMoney } = require('gstech-core/modules/money');
const validate = require('gstech-core/modules/validate');
const { MANUFACTURER_ID } = require('./constants');
const {
  testHashRequestSchema,
  memberDetailsRequestSchema,
  balanceRequestSchema,
  betPlacedRequestSchema,
  betUpdatedRequestSchema,
  balanceUpdatedRequestSchema } = require('./schemas');
const config = require('../../../config');
const currencyMapping = require('./currencies');

const configuration = config.providers.delasport;

const isApiKeyValid = (hash: string, values: Array<string>): boolean => {
  if (!hash) {
    return false;
  }

  // Compute the concatenated string
  const concatString = values.join('') + configuration.sharedSecret;

  // Compute the expected hash using SHA256 based on the concatenated string
  const expectedHash = crypto.createHash('sha256')
    .update(concatString)
    .digest('hex');

  // Return whether the computed hash matches the provided hash
  return expectedHash === hash;
};

const testHash = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport testHash request', { request: req.body });

    const validatedRequest = await validate(req.body, testHashRequestSchema, 'Request validation failed');

    if (!isApiKeyValid(validatedRequest.hash, [])) {
      logger.error('Delasport testHash failed. Invalid hash', { request: req.body });
      return res.status(403).json({
        status: "error",
        payload: {
          code: 1003,
          message: "Invalid hash"
        },
      });
    }

    const { data } = await axios.post(`${config.api.backend.url}/api/v1/test/init-session`, {
      manufacturer: 'DS',
      initialBalance: 1000,
    });

    return res.json({
      status: "success",
      payload: {
        user_id: getExternalPlayerId(data.player),
        auth_token: data.sessionId,
      },
    });
  } catch (e) {
    logger.error('Delasport testHash failed', { request: req.body }, e);

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
}

const memberDetails = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport memberDetails request', { body: req.body, params: req.params , query: req.query, headers: req.headers });

    const validatedRequest: MemberDetailsRequest = await validate(req.body, memberDetailsRequestSchema, 'Request validation failed');

    if (!isApiKeyValid(validatedRequest.hash, [validatedRequest.auth_token])) {
      logger.error('Delasport memberDetails failed. Invalid hash', { request: req.body });
      return res.status(403).json({
        status: "error",
        payload: {
          code: 1003,
          message: "Invalid hash"
        }
      });
    }

    const { auth_token } = validatedRequest;

    const { player } = await api.getPlayerBySession(MANUFACTURER_ID, auth_token);

    const { id, brandId } = player;

    const response = {
      status: "success",
      payload: {
        user_id: getExternalPlayerId({ id, brandId }),
        balance: `${formatMoney(player.balance)}`,
        currency: currencyMapping[player.currencyId],
      }
    };

    logger.debug('Delasport memberDetails response', { response });
    return res.json(response);

  } catch (e) {
    logger.error('Delasport memberDetails failed', { request: req.body }, e);

    if (e.code === 10001) return res.status(400).json({ status: "error", payload: { code: 1001, message: "Token expired" } });
    if (e.code === 10004) return res.status(400).json({ status: "error", payload: { code: 1001, message: "Token expired" } });

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
};

const balance = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport balance request', { request: req.body });

    const validatedRequest: BalanceRequest = await validate(req.query, balanceRequestSchema, 'Request validation failed');

    if (!isApiKeyValid(validatedRequest.hash, [validatedRequest.user_id])) {
      logger.error('Delasport balance failed. Invalid hash', { request: req.body });
      return res.status(403).json({
        status: "error",
        payload: {
          code: 1003,
          message: "Invalid hash"
        }
      });
    }

    const { user_id } = validatedRequest;

    const playerIdentity = getPlayerId(user_id);
    const player = await api.getPlayer(playerIdentity.id);

    const response = {
      status: "success",
      payload: {
        balance: `${formatMoney(player.balance)}`,
      }
    };

    logger.debug('Delasport balance response', { response });
    return res.json(response);

  } catch (e) {
    logger.error('Delasport balance failed', { request: req.body }, e);

    if (e.code === 10001) return res.status(400).json({ status: "error", payload: { code: 1001, message: "Token expired" } });
    if (e.code === 10004) return res.status(400).json({ status: "error", payload: { code: 1001, message: "Token expired" } });

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
};

const betPlaced = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport betPlaced request', { request: req.body });

    const validatedRequest: BetPlacedRequest = await validate(req.body, betPlacedRequestSchema, 'Request validation failed');

    const hashElements = [
      req.body.user_id,
      req.body.bet_transaction_id,
      req.body.real,
      req.body.virtual,
      req.body.created_at,
      req.body.details,
      req.body.tax_real,
      req.body.tax_virtual,
    ];
    // If tax_real or tax_virtual exist and the iframe is used, we append them to hashElements
    // (They are not provided in the provided schema, but you can add them if they're in the actual requests.)

    if (!isApiKeyValid(validatedRequest.hash, hashElements)) {
      logger.error('Delasport betPlaced failed. Invalid hash', { request: req.body });
      return res.status(403).json({
        status: "error",
        payload: {
          code: 1003,
          message: "Invalid hash"
        }
      });
    }

    const playerIdentity = getPlayerId(validatedRequest.user_id);
    const player = await api.getPlayer(playerIdentity.id);

    const details = JSON.parse(validatedRequest.details);
    const ticket = await api.createOrUpdateTicket(validatedRequest.bet_transaction_id, details || {});

    logger.debug('Delasport betPlaced ticket created', { ticket });

    const betRequest = {
      brandId: player.brandId,
      manufacturer: MANUFACTURER_ID,
      closeRound: false,
      amount: parseMoney(validatedRequest.real), // We only use the real stake for debiting
      currencyId: player.currencyId,
      game: 'delasport',
      gameRoundId: validatedRequest.bet_transaction_id,
      transactionId: validatedRequest.bet_transaction_id,
      timestamp: new Date(),
      wins: undefined,
      sessionId: undefined,
    };

    await api.bet(player.id, betRequest);

    return res.json({
      status: "success",
      payload: {}
    });

  } catch (e) {
    logger.error('Delasport betPlaced failed', { request: req.body }, e);

    if (e.code === 10001) return res.status(400).json({ status: "error", payload: { code: 1004, message: "Cannot find user" } });
    if (e.code === 10002) return res.status(400).json({ status: "error", payload: { code: 1007, message: "Cannot find bet" } });

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
};

const betUpdated = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport betUpdated request', { request: req.body });

    const validatedRequest: BetUpdatedRequest = await validate(req.body, betUpdatedRequestSchema, 'Request validation failed');

    const details = JSON.parse(validatedRequest.details);
    const ticket = await api.createOrUpdateTicket(validatedRequest.bet_transaction_id, details || {});

    logger.debug('Delasport betUpdated ticket created', { ticket });

    return res.json({
      status: "success",
      payload: {}
    });
  } catch (e) {
    logger.error('Delasport betUpdated failed', { request: req.body}, e);

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
};

const balanceUpdated = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('Delasport balanceUpdated request', { request: req.body });

    const validatedRequest: BalanceUpdatedRequest = await validate(req.body, balanceUpdatedRequestSchema, 'Request validation failed');

    const hashElements = [
      req.body.user_id,
      req.body.transaction_id,
      req.body.bet_transaction_id,
      req.body.amount,
      req.body.reason,
      req.body.created_at,
    ];

    if (!isApiKeyValid(validatedRequest.hash, hashElements)) {
      logger.error('Delasport balanceUpdated failed. Invalid hash', { request: req.body });

      return res.status(403).json({
        status: "error",
        payload: {
          code: 1003,
          message: "Invalid hash"
        }
      });
    }

    const playerIdentity = getPlayerId(validatedRequest.user_id);
    const player = await api.getPlayer(playerIdentity.id);

    if ([7, 8, 9].includes(validatedRequest.reason)) {
      const cancelRequest = {
        brandId: player.brandId,
        manufacturer: MANUFACTURER_ID,
        transactionId: validatedRequest.bet_transaction_id,
        timestamp: new Date(),
      };

      const cancelResult = await api.cancelTransaction(player.id, cancelRequest);
      if (!cancelResult.transactionFound) {
        logger.error('Delasport balanceUpdated failed. no original trnsaction found');
        return res.status(400).json({ status: "error", payload: { code: 1007, message: "Cannot find bet" } });
      }

      return res.json({
        status: "success",
        payload: {},
      });
    }

    // place bet in case of reason 11
    if ([11].includes(validatedRequest.reason)) {
      const betRequest = {
        brandId: player.brandId,
        manufacturer: MANUFACTURER_ID,
        closeRound: false,
        amount: parseMoney(validatedRequest.amount) * -1, // We only use the real stake for debiting and convert it to negative
        currencyId: player.currencyId,
        game: 'delasport',
        gameRoundId: validatedRequest.transaction_id,
        transactionId: validatedRequest.transaction_id,
        timestamp: new Date(),
        wins: undefined,
        sessionId: undefined,
      };

      await api.bet(player.id, betRequest);

      return res.json({
        status: "success",
        payload: {},
      });
    }

    if ([6, 34, 53].includes(validatedRequest.reason)) {
      const type = validatedRequest.reason === 34 ? 'freespins' : 'win';
      const gameRoundId = validatedRequest.reason === 34 ?
          validatedRequest.transaction_id :
          validatedRequest.bet_transaction_id;

      const winRequest = {
        brandId: player.brandId,
        wins: [{ amount: parseMoney(validatedRequest.amount), type }],
        currencyId: player.currencyId,
        manufacturer: MANUFACTURER_ID,
        game: 'delasport',
        closeRound: true,
        gameRoundId,
        transactionId: validatedRequest.transaction_id,
        timestamp: new Date(),
        sessionId: undefined,
        createGameRound: validatedRequest.reason === 34,
      };

      await api.win(player.id, winRequest);

      return res.json({
        status: "success",
        payload: {},
      });
    }

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "Not implemented" } });
  } catch (e) {
    logger.error('Delasport balanceUpdated failed', { request: req.body }, e);

    if (e.code === 10001) return res.status(400).json({ status: "error", payload: { code: 1004, message: "Cannot find user" } });
    if (e.code === 10002) return res.status(400).json({ status: "error", payload: { code: 1007, message: "Cannot find bet" } });

    return res.status(500).json({ status: "error", payload: { code: 1002, message: "General error" } });
  }
};

module.exports = {
  testHash,
  memberDetails,
  balance,
  betPlaced,
  betUpdated,
  balanceUpdated,
};
