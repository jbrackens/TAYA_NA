// @flow
const joi = require('gstech-core/modules/joi');

const combinedReportSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    brandNumber: joi.number().integer().required(),
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const mediaReportSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    brandNumber: joi.number().integer().required(),
    code: joi.string().trim().required(),
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  combinedReportSchema,
  mediaReportSchema,
};
