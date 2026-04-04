// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../user-roles');
const { affmoreBrandIds } = require('../../../../types/constants');

const createLandingSchema: any = joi.object().keys({
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
  landing: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getLandingsSchema: any = joi.object().keys({
  params: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateLandingSchema: any = joi.object().keys({
  params: joi.object().keys({
    landingId: joi.number().integer().required(),
  }),
  landing: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deleteLandingSchema: any = joi.object().keys({
  params: joi.object().keys({
    landingId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createLandingSchema,
  getLandingsSchema,
  updateLandingSchema,
  deleteLandingSchema,
};
