// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  setLimitSchema: (joi.object({
    type: joi.string().trim().required().valid('selfExclusion', 'deposit', 'sessionLength', 'bet', 'loss', 'timeout'),
    values: joi.object({
      period: joi.string().trim().valid('daily', 'weekly', 'monthly'),
      duration: joi.alternatives().try(joi.number(), joi.string().trim().valid('indefinite')),
      reason: joi.string().trim().required(),
      limit: joi.number(),
      isInternal: joi.boolean().default(false),
    }).required().options({ stripUnknown: true }),
  }): any),
  raiseLimitSchema: (joi.object({
    reason: joi.string().trim().required(),
    period: joi.string().trim().valid('daily', 'weekly', 'monthly'),
    limit: joi.number(),
  }).required().options({ stripUnknown: true }): any),
  cancelLimitSchema: (joi.object({
    delay: joi.boolean().default(false),
    reason: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }): any),
};
