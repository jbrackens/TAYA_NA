// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  updatePaymentMethodSchema: (joi.object({
    active: joi.boolean().optional(),
    requireVerification: joi.boolean().optional(),
    allowAutoVerification: joi.boolean().optional(),
    highRisk: joi.boolean().optional(),
  }): any)
};
