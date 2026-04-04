// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');

const getChildrenAffiliatesSchema: any = joi.object().keys({
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
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const createChildAffiliateSchema: any = joi.object().keys({
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
  }).required().options({ stripUnknown: true }),
  affiliate: joi.object().keys({
    email: joi.string().trim().email().required(),
    name: joi.string().trim().required(),
    info: joi.string().trim().optional().allow(''),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getChildrenAffiliatesSchema,
  createChildAffiliateSchema,
};
