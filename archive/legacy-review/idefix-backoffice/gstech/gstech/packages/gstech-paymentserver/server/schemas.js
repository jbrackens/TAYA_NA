/* @flow */
const joi = require('gstech-core/modules/joi');

const depositSchema: any = joi.object().keys({
  player: joi.object().required(),
  deposit: joi.object().required(),
  params: joi.object(),
  account: joi.object().allow(null),
  urls: joi.object().keys({
    ok: joi.string().trim().required(),
    failure: joi.string().trim().required(),
  }),
  brand: joi.object({
    name: joi.string().trim().required(),
  }).required(),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().allow(null).required(),
    isMobile: joi.boolean().allow(null).default(false).required(),
  }).optional(),
});

const withdrawSchema: any = joi.object().keys({
  player: joi.object().required(),
  withdrawal: joi.object().required(),
  user: joi.object().required(),
  brand: joi.object({
    name: joi.string().trim().required(),
  }).required(),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().allow(null).required(),
    isMobile: joi.boolean().allow(null).required(),
  }).optional(),
});

const identifySchema: any = joi.object().keys({
  player: joi.object().required(),
  identify: joi.object().required(),
  urls: joi.object().keys({
    ok: joi.string().trim().required(),
    failure: joi.string().trim().required(),
  }),
  brand: joi.object({
    name: joi.string().trim().required(),
  }),
});

const registerSchema: any = joi.object().keys({
  player: joi.object().required(),
  deposit: joi.object().required(),
  params: joi.object(),
  urls: joi.object().keys({
    ok: joi.string().trim().required(),
    failure: joi.string().trim().required(),
  }),
  brand: joi.object({
    name: joi.string().trim().required(),
  }),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().allow(null).required(),
    isMobile: joi.boolean().allow(null).required(),
  }).optional(),
});

const loginSchema: any = joi.object().keys({
  player: joi.object().required(),
  deposit: joi.object().required(),
  params: joi.object(),
  urls: joi.object().keys({
    ok: joi.string().trim().required(),
    failure: joi.string().trim().required(),
  }),
  brand: joi.object({
    name: joi.string().trim().required(),
  }),
  client: joi.object({
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).optional(),
    userAgent: joi.string().trim().allow(null).required(),
    isMobile: joi.boolean().allow(null).required(),
  }).optional(),
});

module.exports = {
  depositSchema,
  withdrawSchema,
  identifySchema,
  registerSchema,
  loginSchema,
};
