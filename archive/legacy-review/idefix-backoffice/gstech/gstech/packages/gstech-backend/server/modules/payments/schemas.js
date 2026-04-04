// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  transactionSchema: (joi.object({
    type: joi.string().trim()
      .valid('withdraw', 'compensation', 'correction')
      .when('withdraw', { is: 'accountId', then: joi.required() })
      .required(),
    accountId: joi.number(),
    amount: joi.number().required().when('type', { is: 'correction', otherwise: joi.number().greater(0) }),
    reason: joi.string().trim().required(),
    noFee: joi.boolean().optional().default(true),
  }): any),
  updateDepositSchema: (joi.object({
    wageringRequirement: joi.number().integer().min(0).required(),
    reason: joi.string().trim().optional(),
  }): any),
  completeDepositSchema: (joi.object({
    externalTransactionId: joi.string().trim().required(),
    reason: joi.string().trim().required(),
  }): any),
};
