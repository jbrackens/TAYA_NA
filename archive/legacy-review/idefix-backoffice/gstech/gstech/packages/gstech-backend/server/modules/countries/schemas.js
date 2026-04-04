// @flow
import type { CountryFields } from './Country';

const joi = require('gstech-core/modules/joi');

const countrySchema: Joi$ObjectSchema<CountryFields> = joi.object({
  minimumAge: joi.number().required(),
  loginAllowed: joi.boolean().required(),
  registrationAllowed: joi.boolean().required(),
  blocked: joi.boolean().required(),
  riskProfile: joi.string().trim().valid('low', 'medium', 'high').required(),
  monthlyIncomeThreshold: joi.number().allow(null),
});

module.exports = { countrySchema };
