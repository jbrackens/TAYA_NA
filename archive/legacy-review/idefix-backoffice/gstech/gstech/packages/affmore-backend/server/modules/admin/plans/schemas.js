// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../user-roles');

const createPlanSchema: any = joi.object().keys({
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
  plan: joi.object({
    name: joi.string().trim().required(),
    nrs: joi.number().allow(null).optional(),
    cpa: joi.number().integer().required(),
    archived: joi.boolean().default(false),
  }).required().options({ stripUnknown: true }),
  rules: joi.array().items(joi.object({
    countryId: joi.string().trim().length(2).uppercase().optional(),
    nrs: joi.number().required(),
    cpa: joi.number().integer().required(),
    deposit: joi.number().integer().required(),
    deposit_cpa: joi.number().integer().required(),
  })).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getPlanSchema: any = joi.object().keys({
  params: joi.object().keys({
    planId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updatePlanSchema: any = joi.object().keys({
  params: joi.object().keys({
    planId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  plan: joi.object({
    name: joi.string().trim().required(),
    nrs: joi.number().allow(null).optional(),
    cpa: joi.number().integer().required(),
    archived: joi.boolean().default(false),
  }).required().options({ stripUnknown: true }),
  rules: joi.array().items(joi.object({
    countryId: joi.string().trim().length(2).uppercase().optional(),
    nrs: joi.number().required(),
    cpa: joi.number().integer().required(),
    deposit: joi.number().integer().required(),
    deposit_cpa: joi.number().integer().required(),
  })).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deletePlanSchema: any = joi.object().keys({
  params: joi.object().keys({
    planId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createPlanSchema,
  getPlanSchema,
  updatePlanSchema,
  deletePlanSchema,
};
