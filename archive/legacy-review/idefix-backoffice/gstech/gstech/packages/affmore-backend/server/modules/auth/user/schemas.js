// @flow
const joi = require('gstech-core/modules/joi');

const loginSchema: any = joi.object().keys({
  email: joi.string().trim().email().required().lowercase(),
  password: joi.string().trim().min(8).required(),
}).options({ stripUnknown: true });

module.exports = {
  loginSchema,
};
