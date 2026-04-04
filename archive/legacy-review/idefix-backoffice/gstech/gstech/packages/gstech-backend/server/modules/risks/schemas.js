/* @flow */

const joi = require("gstech-core/modules/joi")

const createRiskSchema: any = joi.object({
  type: joi.string().trim().valid('customer', 'transaction', 'interface', 'geo').required(),
  fraudKey: joi.string().trim().required(),
  points: joi.number().required(),
  maxCumulativePoints: joi.number().required(),
  requiredRole: joi.string().trim().valid('administrator', 'riskManager', 'payments', 'agent'),
  active: joi.boolean().required(),
  name: joi.string().trim().required(),
  title: joi.string().trim().required(),
  description: joi.string().trim().required(),
  manualTrigger: joi.boolean().default(false),
}).options({ stripUnknown: true });

module.exports = {
  createRiskSchema,
}
