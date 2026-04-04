/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const validate = require('gstech-core/modules/validate');
const Promotion = require('./Promotion');
const PromotionGame = require('./PromotionGame');
const Player = require('../players/Player');
const { formatMoney } = require('../core/money');
const { promotionDraftSchema, updatePromotionDraftSchema, createPromotionGameSchema, updatePromotionGamesSchema } = require('./schemas');

const getPlayerPromotionsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { playerId: pid } = req.params;
    const playerId = Number(pid);
    const promotions = await Promotion.getPlayerPromotions(playerId);
    const { currencyId } = await Player.get(playerId);

    const result = promotions.map(({ id, promotion, amount, active, points }) => ({
      id,
      promotion,
      wagered: formatMoney(amount, currencyId),
      active,
      points,
    }));
    return res.json(result);
  } catch (err) {
    logger.warn('Get promotions failed');
    return next(err);
  }
};

const getPromotionsSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const promotions = await Promotion.getPromotions(brandId);

    return res.status(200).json(promotions);
  } catch (err) {
    logger.warn('Get promotion settings failed');
    return next(err);
  }
};

const createPromotionSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const promotionDraft = await validate(req.body, promotionDraftSchema, 'Create promotion settings failed');
    const promotion = await Promotion.createPromotion(promotionDraft);

    return res.status(200).json(promotion);
  } catch (err) {
    logger.warn('Create promotion settings failed');
    return next(err);
  }
};

const updatePromotionSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const promotionId = Number(req.params.promotionId);
    const promotionDraft = await validate(req.body, updatePromotionDraftSchema, 'Update promotion settings failed');
    const promotion = await Promotion.updatePromotion(promotionId, promotionDraft);

    return res.status(200).json(promotion);
  } catch (err) {
    logger.warn('Update promotion settings failed');
    return next(err);
  }
};

const createPromotionGame = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { promotionId, games } = await validate(req.body, createPromotionGameSchema, 'Create promotion game validation failed');
    const promotionGames = await pg.transaction(async tx => Promise.all(games.map(gameId => PromotionGame.createPromotionGame(promotionId, gameId, tx))));
    return res.status(200).json(promotionGames);
  } catch (err) {
    logger.warn('Create promotion game failed');
    return next(err);
  }
};

const getPromotionGames = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { promotionId } = req.params;
    const promotionGames = await PromotionGame.getPromotionGames(Number(promotionId));
    const promotionGameIds = promotionGames.map(({ gameId }) => gameId);

    return res.status(200).json(promotionGameIds);
  } catch (err) {
    logger.warn('Get promotion games failed');
    return next(err);
  }
};

const updatePromotionGames = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { promotionId } = req.params;
    const { games } = await validate(req.body, updatePromotionGamesSchema, 'Update promotion games validation failed');
    const promotionGameIds = await PromotionGame.updatePromotionGames(Number(promotionId), games);

    return res.status(200).json(promotionGameIds);
  } catch (err) {
    logger.warn('Update promotion games failed');
    return next(err);
  }
};

const archivePromotion = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { promotionId } = req.params;
    await Promotion.archivePromotion(Number(promotionId));
    return res.status(200).json(true);
  } catch (err) {
    logger.warn('Archive promotion failed');
    return next(err);
  }
};

module.exports = { getPlayerPromotionsHandler, getPromotionsSettings, createPromotionSettings, updatePromotionSettings, createPromotionGame, getPromotionGames, updatePromotionGames, archivePromotion };
