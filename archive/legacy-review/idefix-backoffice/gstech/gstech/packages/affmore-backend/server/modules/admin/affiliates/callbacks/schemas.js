// @flow
const joi = require('gstech-core/modules/joi');
const { callbackMethods, callbackTriggers } = require('../../../../callback-types');
const userRoles = require('../../../../user-roles');
const { affmoreBrandIds } = require('../../../../../types/constants');

const createCallbackSchema: any = joi.object().keys({
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
  callback: joi.object({
    linkId: joi.number().integer().allow(null).optional(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    method: joi.string().trim().valid(...callbackMethods).required(),
    trigger: joi.string().trim().valid(...callbackTriggers).required(),
    url: joi.string().trim().required(),
    enabled: joi.boolean().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getCallbackSchema: any = joi.object().keys({
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

const updateCallbackSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    callbackId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  callback: joi.object({
    linkId: joi.number().integer().allow(null).optional(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    method: joi.string().trim().valid(...callbackMethods).required(),
    trigger: joi.string().trim().valid(...callbackTriggers).required(),
    url: joi.string().trim().required(),
    enabled: joi.boolean().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deleteCallbackSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    callbackId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getCallbackSchema,
  createCallbackSchema,
  updateCallbackSchema,
  deleteCallbackSchema,
};
