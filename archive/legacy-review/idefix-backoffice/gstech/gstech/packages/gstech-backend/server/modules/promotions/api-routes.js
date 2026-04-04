/* @flow */
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const Promotion = require('./Promotion');
const schemas = require('./schemas');

const getPromotionsHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const promotions = await Promotion.getPlayerPromotions(req.session.playerId);
    const result = promotions.map(Promotion.mapPromotion);
    return res.json({ result });
  } catch (err) {
    logger.warn('getPromotionsHandler failed', err);
    return next(err);
  }
};

const activatePromotionHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const result = await Promotion.activatePromotion(req.session.playerId, req.params.id);
    if (result) {
      return res.json({ result });
    }
    return res.status(404).json({ result });
  } catch (err) {
    logger.warn('activatePromotionHandler failed', err);
    return next(err);
  }
};

const getPromotionLeaderboardHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const query = {
      brands: req.query.brands && _.castArray(req.query.brands),
    };

    const request = await validate(query, schemas.getPromotionLeaderboard, 'getPromotionLeaderboardHandler schema validation failed');
    const brands = request.brands || [req.params.brandId];

    const result = await Promotion.getLeaderboard(brands, req.params.id, Number(req.query.items || 10));
    if (result) {
      return res.json({ result });
    }
    return res.status(404).json({ result });
  } catch (err) {
    logger.warn('getPromotionLeaderboardHandler failed', err);
    return next(err);
  }
};

module.exports = { getPromotionsHandler, activatePromotionHandler, getPromotionLeaderboardHandler };
