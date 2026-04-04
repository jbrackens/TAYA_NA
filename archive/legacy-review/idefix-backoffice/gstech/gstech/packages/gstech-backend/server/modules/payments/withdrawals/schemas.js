// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  withdrawalSchema: (joi.object({
    paymentProviderId: joi.number().required(),
    amount: joi.number().required(),
    parameters: joi.object({
      staticId: joi.number().allow(null),
    }),
  }): any),
  playerPendingWithdrawalSchema: (joi.object({
    playerId: joi.number().required(),
    transactionKey: joi.string().trim().required(),
  }): any),
  requestWithdrawalSchema: (joi.object({
    amount: joi.number().integer().positive().required(),
    accountId: joi.number().integer().positive().required(),
    noFee: joi.boolean().optional().default(false),
  }).required(): any),
  setWithdrawalStatusSchema: (joi.object({
    externalTransactionId: joi.string().trim().required(),
    message: joi.string().trim().optional(),
    rawTransaction: joi.object().optional(),
    paymentCost: joi.number().integer().optional(),
  }).required(): any),
  confirmWithdrawalSchema: (joi.object({
    externalTransactionId: joi.string().trim().required(),
  }).required(): any),
};
