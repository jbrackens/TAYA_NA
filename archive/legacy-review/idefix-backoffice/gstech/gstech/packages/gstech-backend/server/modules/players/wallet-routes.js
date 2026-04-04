/* @flow */
import type {
  PlayerWithBalance,
} from 'gstech-core/modules/clients/backend-wallet-api';

const Boom = require('@hapi/boom');
const walletErrorCodes = require('gstech-core/modules/errors/wallet-error-codes');
const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');
const { pingPlayerSession, findManufacturerSessionWithPlayer, getManufacturerSessions, createManufacturerSession, expireManufacturerSession, updateManufacturerSession } = require('../sessions');
const Player = require('./Player');

const getPlayerBalanceHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const player = await Player.getBalance(playerId);
    if (player == null) {
      return next(Boom.notFound(walletErrorCodes.PLAYER_NOT_FOUND.message, walletErrorCodes.PLAYER_NOT_FOUND));
    }
    const { balance, bonusBalance, currencyId, brandId } = player;
    pingPlayerSession(brandId, playerId);
    return res.json({
      balance: balance + bonusBalance,
      bonusBalance,
      realBalance: balance,
      currencyId,
    });
  } catch (e) {
    logger.warn('getPlayerBalanceHandler failed', e);
    return next(Boom.notFound(walletErrorCodes.PLAYER_NOT_FOUND.message, walletErrorCodes.PLAYER_NOT_FOUND));
  }
};

const getPlayerDetailsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const playerId = Number(req.params.playerId);
    const player = await Player.get(playerId);
    const balance = await Player.getBalance(playerId);
    pingPlayerSession(player.brandId, playerId);
    const result: PlayerWithBalance = { ...player, balance: balance.balance + balance.bonusBalance, bonusBalance: balance.bonusBalance, realBalance: balance.balance };
    return res.status(200).json(result);
  } catch (e) {
    logger.error('getPlayerDetailsHandler', e);
    return next(Boom.notFound(walletErrorCodes.PLAYER_NOT_FOUND.message, walletErrorCodes.PLAYER_NOT_FOUND));
  }
};

const playerBySessionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { sessionId } = req.params;
    const { manufacturerId } = req.params;
    const session = await findManufacturerSessionWithPlayer(manufacturerId, sessionId);
    if (session != null) {
      const player = await Player.get(session.playerId);
      const balance = await Player.getBalance(session.playerId);
      const manufacturerSessions = await getManufacturerSessions(manufacturerId, session.sessionId);
      const sessions = manufacturerSessions.map(({ manufacturerSessionId, type, parameters }) => ({ sessionId: manufacturerSessionId, type, parameters: parameters || {} }));
      const result: {
        player: PlayerWithBalance,
        sessions: {
          sessionId: string,
          type: string,
          parameters: mixed,
        }[],
      } = {
        player: {
          ...player,
          balance: balance.balance + balance.bonusBalance,
          bonusBalance: balance.bonusBalance,
          realBalance: balance.balance,
        },
        sessions,
      };
      return res.status(200).json(result);
    }
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  } catch (e) {
    logger.error('playerBySessionHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

const createSessionSchema = joi.object({
  id: joi.string().trim().required(),
  parameters: joi.object(),
  sessionId: joi.number().required(),
  playerId: joi.number().required(),
});

const createManufacturerSessionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { manufacturerId } = req.params;
    const sessionType = req.params.type;
    const { id, parameters: sessionParameters, playerId, sessionId } = await validate(req.body, createSessionSchema, 'Create manufacturer session failed');

    await createManufacturerSession(manufacturerId, id, sessionId, sessionType, sessionParameters);
    const manufacturerSessions = await getManufacturerSessions(manufacturerId, sessionId);
    const sessions = manufacturerSessions.map(({ manufacturerSessionId, type, parameters, manufacturerId }) => ({ manufacturerId, sessionId: manufacturerSessionId, type, parameters: parameters || {} })); // eslint-disable-line
    const player = await Player.get(playerId);
    const balance = await Player.getBalance(playerId);
    return res.status(200).json({ player: { ...player, ...balance }, sessions });
  } catch (e) {
    logger.error('createManufacturerSessionHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

const createNewSessionSchema = joi.object({
  id: joi.string().trim().required(),
  parameters: joi.object(),
});

const createNewManufacturerSessionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> createNewManufacturerSessionHandler' , req.body);
    const { sessionId } = req.params;
    const { manufacturerId } = req.params;
    const sessionType = req.params.type;
    const mSession = await findManufacturerSessionWithPlayer(manufacturerId, sessionId);
    const { id, parameters: sessionParameters } = await validate(req.body, createNewSessionSchema, 'Create new manufacturer session failed');
    if (mSession != null) {
      await createManufacturerSession(manufacturerId, id, mSession.sessionId, sessionType, sessionParameters);
      const manufacturerSessions = await getManufacturerSessions(manufacturerId, mSession.sessionId);
      const sessions = manufacturerSessions.map(({ manufacturerSessionId, type, parameters, manufacturerId }) => ({ manufacturerId, sessionId: manufacturerSessionId, type, parameters: parameters || {} })); // eslint-disable-line
      const player = await Player.get(mSession.playerId);
      const balance = await Player.getBalance(mSession.playerId);
      logger.debug('<<< createNewManufacturerSessionHandler' , { player: { ...player, ...balance }, sessions });
      return res.status(200).json({ player: { ...player, ...balance }, sessions });
    }
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  } catch (e) {
    logger.error('createNewManufacturerSessionHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

const destroyManufacturerSessionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> destroyManufacturerSessionHandler', req.body);
    const { sessionId } = req.params;
    const { manufacturerId } = req.params;
    await expireManufacturerSession(manufacturerId, sessionId);
    logger.debug('<<< destroyManufacturerSessionHandler', req.body);
    return res.status(200).json({ });
  } catch (e) {
    logger.error('createNewManufacturerSessionHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

const updateManufacturerSessionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { sessionId } = req.params;
    const { manufacturerId } = req.params;
    await updateManufacturerSession(manufacturerId, sessionId, req.body);
    return res.status(200).json({ });
  } catch (e) {
    logger.error('createNewManufacturerSessionHandler', e);
    return next(Boom.notFound(walletErrorCodes.SESSION_NOT_ACTIVE.message, walletErrorCodes.SESSION_NOT_ACTIVE));
  }
};

const getPlayerByUsernameHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId, username }: { brandId: BrandId, username: string } = (req.params: any);
    const player = await Player.findByUsername(brandId, username);
    if (player != null) {
      return res.status(200).json(player);
    }
    return next(Boom.notFound(walletErrorCodes.PLAYER_NOT_FOUND.message, walletErrorCodes.PLAYER_NOT_FOUND));
  } catch (e) {
    logger.error('getPlayerByUsernameHandler', e);
    return next(Boom.notFound(walletErrorCodes.PLAYER_NOT_FOUND.message, walletErrorCodes.PLAYER_NOT_FOUND));
  }
};

module.exports = {
  getPlayerDetailsHandler,
  getPlayerBalanceHandler,
  playerBySessionHandler,
  createManufacturerSessionHandler,
  createNewManufacturerSessionHandler,
  updateManufacturerSessionHandler,
  destroyManufacturerSessionHandler,
  getPlayerByUsernameHandler,
};
