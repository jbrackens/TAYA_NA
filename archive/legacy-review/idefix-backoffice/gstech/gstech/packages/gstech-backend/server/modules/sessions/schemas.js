/* @flow */
const joi = require('gstech-core/modules/joi');

const loginSchema: any = joi.object({
  email: joi.string().trim().required(),
  password: joi.string().trim().required(),
  ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
  userAgent: joi.string().trim(),
}).required();

const mobileLoginSchema: any = joi.object({
  mobilePhone: joi.string().trim().required(),
  ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
  userAgent: joi.string().trim(),
}).required();

const requestLoginSchema: any = joi.alternatives().try(
  joi.object({
    email: joi.string().trim().lowercase().email().required(),
  }).required().options({ stripUnknown: true }),
  joi.object({
    mobilePhone: joi.string().trim().trim().required(),
  }).required().options({ stripUnknown: true }),
);

const completeLoginSchema: any = joi.alternatives().try(
  joi.object({
    email: joi.string().trim().lowercase().email().required(),
    pinCode: joi.string().trim().required(),
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
    userAgent: joi.string().trim(),
  }).required().options({ stripUnknown: true }),
  joi.object({
    mobilePhone: joi.string().trim().trim().required(),
    pinCode: joi.string().trim().required(),
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
    userAgent: joi.string().trim(),
  }).required().options({ stripUnknown: true }),
);

module.exports = { loginSchema, mobileLoginSchema, requestLoginSchema, completeLoginSchema };
