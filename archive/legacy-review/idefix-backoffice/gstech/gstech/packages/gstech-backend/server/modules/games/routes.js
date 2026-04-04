/* @flow */
const times = require('lodash/fp/times');
const keyBy = require('lodash/fp/keyBy');
const mapValues = require('lodash/fp/mapValues');
const logger = require('gstech-core/modules/logger');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');
const Game = require('./Game');
const { gameDraftSchema, profileDraftsSchema, gameProfileDraftSchema } = require('./schemas');

const getGamesSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const games = await Game.getAllGames();
    return res.status(200).json(games);
  } catch (err) {
    logger.warn('Get games settings failed');
    return next(err);
  }
};

const createGameSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> createGameSettings request', { body: req.body });
    const bodySchema = joi
      .object()
      .keys({
        gameDraft: gameDraftSchema,
        profileDrafts: profileDraftsSchema,
      });
    const { gameDraft, profileDrafts } = await validate(req.body, bodySchema, 'Create game settings failed');

    const game = await Game.create(gameDraft);
    await Promise.all(
      profileDrafts.filter(({ gameProfileId }) => !!gameProfileId).map(({ brandId, gameProfileId }) => Game.upsertProfile(game.id, brandId, gameProfileId)),
    );
    logger.debug('<<< createGameSettings response', { game });
    return res.status(200).json(game);
  } catch (err) {
    logger.warn('Create game settings failed');
    return next(err);
  }
};

const updateGameSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    logger.debug('>>> updateGameSettings request', { body: req.body });
    const gameId = Number(req.params.gameId);
    const gameDraft = await validate(req.body, gameDraftSchema, 'Update game settings failed');

    const game = await Game.update(gameId, gameDraft);
    logger.debug('<<< updateGameSettings response', { game });
    return res.status(200).json(game);
  } catch (err) {
    logger.warn('Update game settings failed');
    return next(err);
  }
};

const mapProfiles = (profileIds: Array<Id>, profileNames: Array<string>) => times(index => ({
  id: profileIds[index],
  name: profileNames[index],
}), profileIds.length);

const getBrandGameProfiles = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const gameId = Number(req.params.gameId);
    const gameProfilesArray = await Game.getBrandGameProfiles(gameId);
    const profilesByBrand = mapValues('gameProfileId', keyBy('brandId', gameProfilesArray));
    const availableGameProfilesByBrand = await Game.getAvailableProfilesByBrand();
    const gameProfiles = availableGameProfilesByBrand.map(({ brandId, brandName, gameProfileIds, gameProfileNames }) => ({
      brandId,
      brandName,
      gameProfileId: profilesByBrand[brandId],
      availableProfiles: mapProfiles(gameProfileIds, gameProfileNames),
    }));

    return res.status(200).json(gameProfiles);
  } catch (err) {
    logger.warn('Get game profiles failed');
    return next(err);
  }
};

const getAvailableGameProfiles = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const availableProfiles = await Game.getAvailableProfilesByBrand();
    const mappedProfiles = availableProfiles.map(({ brandId, brandName, gameProfileIds, gameProfileNames }) => ({
      brandId,
      brandName,
      availableProfiles: mapProfiles(gameProfileIds, gameProfileNames),
    }));

    return res.status(200).json(mappedProfiles);
  } catch (err) {
    logger.warn('Get available game profiles by brand failed');
    return next(err);
  }
};

const updateGameProfiles = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const profileDrafts = await validate(req.body, profileDraftsSchema, 'Update game profiles failed');
    const gameId = Number(req.params.gameId);

    const profiles = await Promise.all(
      profileDrafts.filter(({ gameProfileId }) => !!gameProfileId).map(({ brandId, gameProfileId }) => Game.upsertProfile(gameId, brandId, gameProfileId)),
    );
    return res.status(200).json(profiles);
  } catch (err) {
    logger.warn('Update game profiles failed');
    return next(err);
  }
};

const getGameProfileSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const gameProfileSettings = await Game.getGameProfiles(brandId);
    return res.status(200).json(gameProfileSettings);
  } catch (err) {
    logger.warn('Get game profile settings failed');
    return next(err);
  }
};

const createGameProfileSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const gameProfileDraft = await validate(req.body, gameProfileDraftSchema, 'Create game profile settings failed');
    const gameProfile = await Game.createGameProfile(gameProfileDraft);

    return res.status(200).json(gameProfile);
  } catch (err) {
    logger.warn('Create game profile settings failed');
    return next(err);
  }
};

const updateGameProfileSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const gameProfileId = Number(req.params.gameProfileId);
    const gameProfileDraft = await validate(req.body, gameProfileDraftSchema, 'Update game profile settings failed');

    const gameProfile = await Game.updateGameProfile(gameProfileId, gameProfileDraft);
    return res.status(200).json(gameProfile);
  } catch (err) {
    logger.warn('Update game profile settings failed');
    return next(err);
  }
};

module.exports = {
  getGamesSettings,
  createGameSettings,
  updateGameSettings,
  getBrandGameProfiles,
  getAvailableGameProfiles,
  updateGameProfiles,
  getGameProfileSettings,
  updateGameProfileSettings,
  createGameProfileSettings,
};
