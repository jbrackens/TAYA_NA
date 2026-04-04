// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');

const createAffiliateLogSchema: any = joi.object().keys({
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
  log: joi.object().keys({
    note: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateLogSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createAffiliateLogSchema,
  getAffiliateLogSchema,
};
