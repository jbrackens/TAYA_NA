// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');

const getSubAffiliatesSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const createSubAffiliateSchema: any = joi.object().keys({
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
    subAffiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  commissionShare: joi.number().integer().required(),
}).options({ stripUnknown: true });

const updateSubAffiliateSchema: any = joi.object().keys({
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
    subAffiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  commissionShare: joi.number().integer().required(),
}).options({ stripUnknown: true });

const deleteSubAffiliateSchema: any = joi.object().keys({
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
    subAffiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getSubAffiliatesSchema,
  createSubAffiliateSchema,
  updateSubAffiliateSchema,
  deleteSubAffiliateSchema,
};
