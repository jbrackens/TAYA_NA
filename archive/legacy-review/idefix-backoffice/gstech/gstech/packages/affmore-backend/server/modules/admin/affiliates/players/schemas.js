// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');
const { affmoreBrandIds } = require('../../../../../types/constants');

const getAffiliatePlayersRevenuesSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    year: joi.number().integer().optional(),
    month: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }),
}).options({ stripUnknown: true });

const getAffiliatePlayerActivitiesSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    playerId: joi.number().integer().required(),
    year: joi.number().integer().optional(),
    month: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateAffiliatePlayerSchema: any = joi.object().keys({
  session: joi.object().keys({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    playerId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  player: joi.object().keys({
    affiliateId: joi.number().integer().optional(),
    planId: joi.number().integer().optional(),
    linkId: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getAffiliatePlayersRevenuesSchema,
  getAffiliatePlayerActivitiesSchema,
  updateAffiliatePlayerSchema,
};
