// @flow
const joi = require('gstech-core/modules/joi');
const { affmoreBrandIds } = require('../../../../../types/constants');

const getAffiliateActivitiesSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    from: joi.string().trim().required(), // TODO: maybe more string validation here. yyyy-MM-dd
    to: joi.string().trim().required(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getAffiliateActivitiesSchema,
};
