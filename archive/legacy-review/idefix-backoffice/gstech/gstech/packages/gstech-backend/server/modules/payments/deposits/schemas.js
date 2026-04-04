/* @flow */
const joi = require('gstech-core/modules/joi');

const startDepositSchema: any = joi.alternatives().try(
  joi.object({
    depositMethod: joi.string().trim().required(),
    amount: joi.number().positive().integer().required(),
    bonusId: joi.number().positive().integer().optional(),
    parameters: joi.object().optional(),
    fee: joi.number().positive().integer().optional(),
  }).required(),
  joi.object({
    depositMethod: joi.string().trim().required(),
    amount: joi.number().positive().integer().required(),
    bonusCode: joi.string().trim().optional(),
    parameters: joi.object().optional(),
    fee: joi.number().positive().integer().optional(),
  }).required(),
);

const updateDepositSchema: any = joi.object({
  amount: joi.number().integer().positive().optional(),
  externalTransactionId: joi.string().trim().optional(),
  account: joi.string().trim().max(200).optional(),
  accountHolder: joi.string().trim().max(200).optional(),
  status: joi.string().trim().valid('complete', 'pending').optional(),
  message: joi.string().trim().optional(),
  rawTransaction: joi.object(),
  accountParameters: joi.object(),
  depositParameters: joi.object(),
}).required();

const processDepositSchema: any = joi.alternatives().try(
  joi.object({
    withoutAmount: joi.boolean().required().allow(true),
    externalTransactionId: joi.string().trim().required(),
    account: joi.string().trim().max(200).allow('').optional(),
    accountHolder: joi.string().trim().max(200).allow(null).optional(),
    status: joi.string().trim().valid('complete', 'pending', 'settled').default('complete'),
    message: joi.string().trim().optional(),
    rawTransaction: joi.object(),
    accountParameters: joi.object(),
    paymentCost: joi.number().integer().optional(),
  }).required(),
  joi.object({
    amount: joi.number().integer().positive().required(),
    externalTransactionId: joi.string().trim().required(),
    account: joi.string().trim().max(200).allow('').optional(),
    accountHolder: joi.string().trim().max(200).allow(null).optional(),
    status: joi.string().trim().valid('complete', 'pending', 'settled').default('complete'),
    message: joi.string().trim().optional(),
    rawTransaction: joi.object(),
    accountParameters: joi.object(),
    paymentCost: joi.number().integer().optional(),
  }).required(),
);

const setDepositStatusSchema: any = joi
  .object({
    transactionKey: joi.string().trim().guid().required(),
    status: joi
      .string()
      .trim()
      .valid('complete', 'expired', 'failed', 'cancelled')
      .default('complete')
      .required(),
    message: joi.string().trim().optional(),
    rawTransaction: joi.optional(),
  })
  .required();

const adjustDepositWageringSchema: any = joi.object({
  wageringRequirement: joi.number().positive().integer().required(),
  reason: joi.string().trim().optional(),
}).required();

const executeDepositSchema: any = joi.object({
  transactionKey: joi.string().trim().guid().required(),
  params: joi.object(),
  accountId: joi.number().allow(null),
  urls: joi.object({
    ok: joi.string().trim().uri().required(),
    failure: joi.string().trim().uri().required(),
  }),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().required(),
    isMobile: joi.boolean().required(),
  }).optional(),
}).required();

module.exports = { setDepositStatusSchema, processDepositSchema, updateDepositSchema, startDepositSchema, adjustDepositWageringSchema, executeDepositSchema };
