/* @flow */

const joi = require('gstech-core/modules/joi');
const { brands } = require('gstech-core/modules/constants');

const brandIds = brands.map(({ id }) => id);

const createGameSchema: any = joi
  .object({
    brandId: joi.string().trim().required().valid(...brandIds),
    permalink: joi.string().trim().required(),
    name: joi.string().trim().required(),
    manufacturer: joi.string().trim().optional().allow('').default(''),
    primaryCategory: joi.string().trim().required(),
    aspectRatio: joi.string().trim().valid('16x9', '4:3', '3x2', 'wms-wide').required(),
    viewMode: joi.string().trim().valid('single', 'max').required(),
    newGame: joi.boolean().required(),
    jackpot: joi.boolean().required(),
    promoted: joi.boolean().required(),
    thumbnailId: joi.number().optional().allow(null),
    searchOnly: joi.boolean().required(),
    active: joi.boolean().required(),
    order: joi.number().optional(),
    keywords: joi.string().trim().optional().allow('').default(''),
    tags: joi.array().items(joi.string().trim()).optional(),
    parameters: joi.object().optional().allow(null).default({}),
  })
  .options({ stripUnknown: true });

const getGamesSchema: any = joi
  .object({
    brandId: joi.string().trim().brandId().required(),
  })
  .options({ stripUnknown: true });

const getPlayerGamesSchema: any = joi
  .object({
    player: joi.number().required(),
  })
  .options({ stripUnknown: true });

const updateGameSchema: any = joi
  .object({
    brandId: joi.string().trim().optional().valid(...brandIds),
    permalink: joi.string().trim().optional(),
    name: joi.string().trim().optional(),
    manufacturer: joi.string().trim().optional().allow(''),
    primaryCategory: joi.string().trim().optional(),
    aspectRatio: joi.string().trim().valid('16x9', '4:3', '3x2', 'wms-wide').optional(),
    viewMode: joi.string().trim().valid('single', 'max').optional(),
    newGame: joi.boolean().optional(),
    jackpot: joi.boolean().optional(),
    promoted: joi.boolean().optional(),
    dropAndWins: joi.boolean().optional(),
    thumbnailId: joi.number().optional().allow(null),
    searchOnly: joi.boolean().optional(),
    active: joi.boolean().optional(),
    order: joi.number().optional(),
    keywords: joi.string().trim().optional().allow(''),
    tags: joi.array().items(joi.string().trim()).optional(),
    parameters: joi.object().optional().allow(null),
  })
  .options({ stripUnknown: true });

module.exports = {
  createGameSchema,
  getGamesSchema,
  getPlayerGamesSchema,
  updateGameSchema,
};
