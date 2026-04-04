/* @flow */

const joi = require('gstech-core/modules/joi');

const emailCheckSchema: any = joi
  .object({
    email: joi.string().trim().email().required(),
  })
  .options({ stripUnknown: true });

module.exports = {
  emailCheckSchema,
};
