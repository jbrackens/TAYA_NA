// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  loginSchema: (joi.object({
    email: joi.string().trim().email().required(),
    password: joi.string().trim().min(8).required(),
  }): any),
  accessSettingsSchema: (joi.object({
    accountClosed: joi.boolean(),
    loginBlocked: joi.boolean(),
    requirePasswordChange: joi.boolean(),
    reportingAccess: joi.boolean(),
    administratorAccess: joi.boolean(),
    paymentAccess: joi.boolean(),
    campaignAccess: joi.boolean(),
    riskManager: joi.boolean(),
  }): any),
  userSchema: (joi.object({
    name: joi.string().trim().required(),
    handle: joi.string().trim().required(),
    email: joi.string().trim().email().required(),
    mobilePhone: joi.string().trim().required(),
  }): any),
  passwordSchema: (joi.object({
    oldPassword: joi.string().trim().required(),
    newPassword: joi.string().trim().required(),
    confirmPassword: joi.string().trim().required(),
  }): any),
  resetPasswordSchema: (joi.object({
    newPassword: joi.string().trim().required(),
    confirmPassword: joi.string().trim().required(),
    email: joi.string().trim().email().required(),
    code: joi.number().required(),
  }): any),
  confirmCodeSchema: (joi.object({
    email: joi.string().trim().email().required(),
    code: joi.number().required(),
  }): any),
};
