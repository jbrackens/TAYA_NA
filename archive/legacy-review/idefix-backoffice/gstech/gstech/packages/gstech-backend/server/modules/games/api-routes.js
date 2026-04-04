/* eslint-disable no-param-reassign */
/* @flow */
import type { GameProvider } from 'gstech-core/modules/constants';

const _ = require('lodash');
const flatten = require('lodash/flatten');
const promiseLimit = require('promise-limit');
const joi = require('gstech-core/modules/joi');

const limit = promiseLimit(2);

const pg = require('gstech-core/modules/pg');
const api = require('gstech-core/modules/clients/walletserver-api');
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const errorCodes = require('gstech-core/modules/errors/error-codes');
const {
  launchGame,
  launchDemoGame,
  getGamesForBrand,
  getTopGames,
  getByPermalink,
  getByGameIdWithParameters,
} = require('./Game');
const { doMaintenance } = require('../bonuses');
const { getRequireDueDiligenceFlags } = require('../players');
const Player = require('../players/Player');
const Currencies = require('../settings/Currencies');
const Session = require('../sessions/Session');

const launchGameSchema = joi.object({
  parameters: joi.object(),
  requireActivation: joi.boolean().default(true),
});

const validateAccount = async (playerId: Id) => {
  const { locked } = await getRequireDueDiligenceFlags(playerId);
  if (locked) {
    return Promise.reject({ error: errorCodes.GAME_PLAY_BLOCKED });
  }
  return true;
};

const launchGameHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed | express$Response> => {
  try {
    logger.debug('>>> launchGameHandler', { session: req.session, body: req.body });
    const session = await Session.get(req.session.playerId, req.session.id);
    const { playTimeInMinutes } = session;
    const game = await validate(req.body, launchGameSchema, 'Launch game validation failed');
    logger.debug('+++ launchGameHandler', { game });
    await validateAccount(req.session.playerId);
    const result = await launchGame(
      +req.session.playerId,
      +req.params.gameId,
      req.session.id,
      game.requireActivation,
      game.parameters,
      playTimeInMinutes,
    );
    logger.debug('<<< launchGameHandler', { result });
    return res.json(result);
  } catch (e) {
    logger.error('XXX launchGameHandler', { error: e });
    // logger.warn('Game launch failed', e);
    return next(e);
  }
};

const launchDemoGameSchema = joi.object({
  languageId: joi.string().trim().default('en'),
  currencyId: joi.string().trim().default('EUR'),
  parameters: joi.object(),
  client: joi
    .object({
      ipAddress: joi
        .string()
        .trim()
        .ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' })
        .optional(),
      userAgent: joi.string().trim().required(),
      isMobile: joi.boolean().required(),
    })
    .optional(),
});

const launchDemoGameHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const brandId: BrandId = (req.params.brandId: any);
    const game = await validate(
      req.body,
      launchDemoGameSchema,
      'Launch demo game validation failed',
    );
    const result = await launchDemoGame(
      brandId,
      Number(req.params.gameId),
      game.languageId,
      game.currencyId,
      game.parameters,
      game.client,
    );
    return res.json(result);
  } catch (e) {
    logger.warn('Demo game launch failed', e);
    return next(e);
  }
};

const returnGamesHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await getGamesForBrand(req.params.brandId);
    return res.json(result);
  } catch (e) {
    logger.warn('return games failed', e);
    return next(e);
  }
};

const getGameByGameIdHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { gameId } = req.params;

    const result = await getByGameIdWithParameters(gameId);

    return res.json(result);
  } catch (e) {
    logger.warn('return game failed', e);
    return next(e);
  }
};

const getTopGamesHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await getTopGames(req.session.playerId);
    return res.json(result);
  } catch (e) {
    logger.warn('Get top games failed', e);
    return next(e);
  }
};

const creditGameFreeSpinsSchema = joi.object({
  bonusCode: joi.string().trim().required(),
  id: joi.string().trim().optional(),
  permalink: joi.string().trim().required(),
  metadata: joi.object().optional(),
  spinCount: joi.number().allow(null).optional(),
  spinValue: joi.number().allow(null).optional(),
  spinType: joi.string().valid('normal', 'super', 'mega').allow(null).optional(),
});

const creditGameFreeSpinsHandler = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('>>> creditGameFreeSpinsHandler', req.body);
    const { bonusCode, id, permalink, metadata, spinValue, spinType, spinCount } = await validate(
      req.body,
      creditGameFreeSpinsSchema,
      'Credit frees spins schema validation failed',
    );
    const brandId: BrandId = (req.params.brandId: any);
    const games = await getByPermalink(permalink);

    const { playerId, id: sessionId } = req.session;
    if (games.length > 0) {
      const player = await Player.get(playerId);
      const client = await Player.getClientInfo(playerId);
      await pg.transaction((tx) => doMaintenance(playerId, tx));
      const creditSpins = {
        player,
        sessionId,
        bonusCode,
        id,
        metadata,
        spinValue,
        spinType,
        spinCount,
        client,
        games: games.map(({ mobileGame, manufacturerGameId }) => ({
          mobileGame,
          manufacturerGameId,
        })),
      };

      const result = await api.creditFreeSpins(brandId, games[0].manufacturerId, creditSpins);
      return res.json(result);
    }
    return res.status(500).json({ error: errorCodes.GAME_PROVIDER_FAILED });
  } catch (e) {
    logger.error('Credit free spins failed', e);
    return res
      .status(500)
      .json({ error: { code: errorCodes.GAME_PROVIDER_FAILED.code, message: e.message } });
  }
};

const getJackpotsHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const brandId: BrandId = (req.params.brandId: any);

    const currencies = await Currencies.getCurrencies(brandId);
    const games = await getGamesForBrand(brandId);

    const result = await Promise.all(
      _.values(_.groupBy(games, 'manufacturerId')).map((manufacturerGames) => {
        const body = {
          currencies: currencies.map((x) => x.id),
          games: manufacturerGames.map((x) => ({
            manufacturerGameId: x.manufacturerGameId,
            gameId: x.gameId,
          })),
        };
        const { manufacturerId } = manufacturerGames[0];
        return limit(() => api.getJackpots(brandId, manufacturerId, body));
      }),
    );

    const jackpots = result.filter(
      (gjr) =>
        gjr.filter((gameJackpots) => {
          const game = games.find((g) => g.gameId === gameJackpots.game);

          // $FlowFixMe[incompatible-type]
          // $FlowFixMe[prop-missing]
          gameJackpots.permalink = game && game.permalink;
          gameJackpots.currencies = gameJackpots.currencies.filter(
            (jackpotItem) => jackpotItem.amount !== '0',
          );
          return gameJackpots.currencies.length > 0;
        }).length > 0,
    );

    const existingJackpots = flatten<any, any>(jackpots);

    return res.json(existingJackpots);
  } catch (e) {
    logger.error('Get jackpot failed', e);
    return next(e);
  }
};

const getLeaderBoardHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const brandId: BrandId = (req.params.brandId: any);
    const manufacturerId: GameProvider = (req.params.manufacturerId: any);
    const { achievement } = req.params;

    const result = await api.getLeaderBoard(brandId, manufacturerId, achievement);

    return res.json(result);
  } catch (e) {
    logger.error('Get Leader Board failed', e);
    return next(e);
  }
};

const pingHandler = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const brandId: BrandId = (req.params.brandId: any);
    const manufacturerId: GameProvider = (req.params.manufacturerId: any);

    const result = await api.ping(brandId, manufacturerId);

    return res.json(result);
  } catch (e) {
    logger.error('Ping failed', e);
    return next(e);
  }
};

module.exports = {
  launchGameHandler,
  launchDemoGameHandler,
  returnGamesHandler,
  getGameByGameIdHandler,
  getTopGamesHandler,
  creditGameFreeSpinsHandler,
  getJackpotsHandler,
  getLeaderBoardHandler,
  pingHandler,
};
