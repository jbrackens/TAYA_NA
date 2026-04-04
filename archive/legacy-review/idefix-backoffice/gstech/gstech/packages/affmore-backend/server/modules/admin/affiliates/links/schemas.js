// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');
const { affmoreBrandIds } = require('../../../../../types/constants');

const createAffiliateLinkSchema: any = joi.object().keys({
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
  link: joi.object().keys({
    planId: joi.number().integer().allow(null).optional(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    name: joi.string().trim().required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateLinksSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }),
}).options({ stripUnknown: true });

const getAffiliateLinkClicksSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    from: joi.string().trim().required(),
    to: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateAffiliateLinkSchema: any = joi.object().keys({
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
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  link: joi.object().keys({
    planId: joi.number().integer().allow(null).optional(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
    name: joi.string().trim().required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deleteAffiliateLinkSchema: any = joi.object().keys({
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
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createAffiliateLinkSchema,
  getAffiliateLinksSchema,
  getAffiliateLinkClicksSchema,
  updateAffiliateLinkSchema,
  deleteAffiliateLinkSchema,
};
