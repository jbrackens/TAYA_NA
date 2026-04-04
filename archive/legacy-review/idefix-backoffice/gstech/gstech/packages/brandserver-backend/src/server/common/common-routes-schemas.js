/* @flow */
const joi = require('joi');

const requestPasswordResetSchema: any = joi.alternatives().try(
  joi
    .object({
      email: joi
        .string().trim()
        .lowercase()
        .email()
        .required(),
      dateOfBirth: joi
        .date()
        .iso()
        .optional(),
    })
    .required()
    .options({ stripUnknown: true }),
  joi
    .object({
      mobilePhone: joi
        .string().trim()
        .trim()
        .required(),
      dateOfBirth: joi
        .date()
        .iso()
        .optional(),
    })
    .required()
    .options({ stripUnknown: true }),
);


const completePasswordResetSchema: any = joi.alternatives().try(
  joi
    .object({
      email: joi
        .string().trim()
        .lowercase()
        .email()
        .required(),
      pinCode: joi.string().trim().required(),
      newPassword: joi.string().trim().required(),
    })
    .required()
    .options({ stripUnknown: true }),
  joi
    .object({
      mobilePhone: joi
        .string().trim()
        .trim()
        .required(),
      pinCode: joi.string().trim().required(),
      newPassword: joi.string().trim().required(),
    })
    .required()
    .options({ stripUnknown: true }),
);

module.exports = {
  completePasswordResetSchema,
  requestPasswordResetSchema,
};