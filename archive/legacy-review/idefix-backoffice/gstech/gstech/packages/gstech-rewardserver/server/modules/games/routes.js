/* @flow */
import type { GameDraft, Game, GameWithThumbnailData } from 'gstech-core/modules/types/rewards';
import type { GameManufacturersResponse } from 'gstech-core/modules/clients/backend-payment-api';

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const gamesApi = require('gstech-core/modules/clients/backend-games-api');

const Games = require('./Games');
const {
  createGameSchema,
  getGamesSchema,
  // getPlayerGamesSchema,
  updateGameSchema,
} = require('./schemas');

const createGame = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createGame request', { body: req.body });

    const gameDraft = validate<GameDraft>(req.body, createGameSchema);

    const game = await Games.getGameByPermalink(pg, gameDraft.permalink, gameDraft.brandId);
    if (game) {
      return res
        .status(409)
        .json({ error: { message: `Game with permalink "${req.body.permalink}" already exists` } });
    }

    const { id: gameId } = await Games.createGame(pg, gameDraft);

    const response: DataResponse<{ gameId: Id }> = { data: { gameId } };
    return res.json(response);
  } catch (e) {
    logger.error('createGame error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteGame = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteGame request', { params: req.params, body: req.body });

    const {
      params: { gameId },
    }: { params: { gameId: Id } }  = (req: any);

    const game = await Games.getGameById(pg, gameId);
    if (!game) {
      return res.status(404).json({ error: { message: `Game ${gameId} not found` } });
    }

    await Games.deleteGame(pg, gameId);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('deleteGame error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getGames = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getGames request', { query: req.query });

    const { brandId } = validate(req.query, getGamesSchema);

    const games = await Games.getGames(pg, brandId, false);

    const response: DataResponse<Game[]> = { data: games };
    return res.json(response);
  } catch (e) {
    logger.error('getGames error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getGamesPermalinks = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getGamesPermalinks request', { query: req.query });

    const { brandId } = validate(req.query, getGamesSchema);

    const games = await gamesApi.getGames(brandId);
    const gamesSet = new Set(games.map(({ permalink }) => permalink).filter((p) => !!p));

    const response: DataResponse<string[]> = { data: Array.from(gamesSet) };
    return res.json(response);
  } catch (e) {
    logger.error('getGamesPermalinks error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerGames = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getGames request', { params: req.params, query: req.query });

    // const { player } = validate(req.query, getPlayerGamesSchema);

    const games = await Games.getPlayerGames(pg, (req.params.brandId: any));

    const response: DataResponse<GameWithThumbnailData[]> = { data: games };
    return res.json(response);
  } catch (e) {
    logger.error('getGames error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateGame = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateGame request', { params: req.params, body: req.body });

    const {
      params: { gameId },
    }: { params: { gameId: Id } }  = (req: any);
    const gameDraft = validate(req.body, updateGameSchema);
    logger.debug('updateGame gameDraft', { gameId, gameDraft })

    const game = await Games.getGameById(pg, gameId);
    if (!game) {
      return res.status(404).json({ error: { message: `Game ${gameId} not found` } });
    }

    await Games.updateGame(pg, gameId, gameDraft);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('updateGame error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getGamesManufacturers = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getGamesManufacturers request', { query: req.query });

    const gameManufacturers = await gamesApi.getGameManufacturers(req.query.countryId);

    const response: DataResponse<GameManufacturersResponse> = { data: gameManufacturers };
    return res.json(response);
  } catch (e) {
    logger.error('getGamesManufacturers error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  createGame,
  deleteGame,
  getGames,
  getGamesPermalinks,
  getPlayerGames,
  updateGame,
  getGamesManufacturers
};
