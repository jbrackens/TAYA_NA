// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');
const { affmoreBrandIds } = require('../../../../../types/constants');

const createAffiliateDealSchema: any = joi.object().keys({
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
  deal: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    planId: joi.number().integer().required(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateDealsSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const upsertAffiliateDealSchema: any = joi.object().keys({
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
  deal: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    planId: joi.number().integer().required(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deleteAffiliateDealSchema: any = joi.object().keys({
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
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createAffiliateDealSchema,
  getAffiliateDealsSchema,
  upsertAffiliateDealSchema,
  deleteAffiliateDealSchema,
};
