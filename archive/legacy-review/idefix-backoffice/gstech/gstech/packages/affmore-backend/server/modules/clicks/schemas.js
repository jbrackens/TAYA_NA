// @flow
const joi = require('gstech-core/modules/joi');

const clickSchema: any = joi.object().keys({
  headers: joi.object().keys({
    'user-agent': joi.string().trim().optional(),
    referrer: joi.string().trim().optional(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    brandNumber: joi.number().optional(),
    code: joi.string().trim().required(),
    segment: joi.string().trim().optional(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    rid: joi.string().trim().optional(),
    segment: joi.string().trim().optional(),
  }).optional()
}).options({ stripUnknown: true });

const refSchema: any = joi.object().keys({
  params: joi.object().keys({
    code: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    url: joi.string().trim().required(),
  }).required()
}).options({ stripUnknown: true });


module.exports = {
  clickSchema,
  refSchema,
};
