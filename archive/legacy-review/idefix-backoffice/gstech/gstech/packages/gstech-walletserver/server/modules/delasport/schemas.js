/* @flow */
const Joi = require('gstech-core/modules/joi');

const testHashRequestSchema: any = Joi.object({
  hash: Joi.string().required(),
}).options({ stripUnknown: true });

const memberDetailsRequestSchema: any = Joi.object({
  auth_token: Joi.string().required(),
  hash: Joi.string().required(),
}).options({ stripUnknown: true });

const balanceRequestSchema: any = Joi.object({
  user_id: Joi.string().required(),
  hash: Joi.string().required(),
}).options({ stripUnknown: true });

const betPlacedRequestSchema: any = Joi.object({
  user_id: Joi.string().max(128).required(),
  bet_transaction_id: Joi.string().max(65).required(),
  real: Joi.number().required(),
  virtual: Joi.number().required(),
  created_at: Joi.date().required(),
  details: Joi.string().required(),
  hash: Joi.string().required()
}).options({ stripUnknown: true });

const betUpdatedRequestSchema: any = Joi.object({
  user_id: Joi.string().max(128).required(),
  transaction_id: Joi.string().required(),
  bet_transaction_id: Joi.string().max(65).optional(),
  real: Joi.number().required(),
  virtual: Joi.number().required(),
  details: Joi.string().required(),
  hash: Joi.string().required()
}).options({ stripUnknown: true });

const balanceUpdatedRequestSchema: any = Joi.object({
  user_id: Joi.string().max(128).required(),
  transaction_id: Joi.string().required(),
  bet_transaction_id: Joi.string().optional(),
  amount: Joi.number().required(),
  reason: Joi.number().required(),
  created_at: Joi.date().required(),
  hash: Joi.string().required()
}).options({ stripUnknown: true });

module.exports = {
  testHashRequestSchema,
  memberDetailsRequestSchema,
  balanceRequestSchema,
  betPlacedRequestSchema,
  betUpdatedRequestSchema,
  balanceUpdatedRequestSchema,
};
