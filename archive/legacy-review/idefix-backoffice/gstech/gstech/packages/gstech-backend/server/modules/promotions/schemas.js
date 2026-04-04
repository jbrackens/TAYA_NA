// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  promotionDraftSchema: (joi
    .object()
    .keys({
      name: joi.string().trim().required(),
      brandId: joi.string().trim().required(),
      multiplier: joi.number().required(),
      autoStart: joi.boolean().required(),
      active: joi.boolean().required(),
      allGames: joi.boolean().required(),
      calculateRounds: joi.boolean().required(),
      calculateWins: joi.boolean().required(),
      calculateWinsRatio: joi.boolean().required(),
      minimumContribution: joi.number().min(0).required(),
    }): any),
  updatePromotionDraftSchema: (joi
    .object()
    .keys({
      name: joi.string().trim().required(),
      multiplier: joi.number().required(),
      autoStart: joi.boolean().required(),
      active: joi.boolean().required(),
      allGames: joi.boolean().required(),
      calculateRounds: joi.boolean().required(),
      calculateWins: joi.boolean().required(),
      calculateWinsRatio: joi.boolean().required(),
      minimumContribution: joi.number().min(0).required(),
    }): any),
  createPromotionGameSchema: (joi
    .object()
    .keys({
      promotionId: joi.number().required(),
      games: joi.array().items(joi.number()).required(),
    }): any),
  updatePromotionGamesSchema: (joi
    .object()
    .keys({
      games: joi.array().items(joi.number()).required(),
    }): any),
  getPromotionLeaderboard: (joi.object({
    brands: joi.array().items(joi.string().trim().brandId()).optional(),
  }): any),
};
