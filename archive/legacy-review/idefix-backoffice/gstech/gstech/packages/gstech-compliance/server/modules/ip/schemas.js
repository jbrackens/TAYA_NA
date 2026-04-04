/* @flow */

const joi = require('gstech-core/modules/joi');

const ipCheckSchema: any = joi
  .object({
    ip: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
  })
  .options({ stripUnknown: true });

module.exports = {
  ipCheckSchema,
};
