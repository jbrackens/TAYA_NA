/* @flow */
const joi = require('gstech-core/modules/joi');

const changePasswordSchema: any = joi.object({
  oldPassword: joi.string().trim().required(),
  newPassword: joi.string().trim().required(),
}).required();

const setPasswordSchema: any = joi.object({
  newPassword: joi.string().trim().required(),
}).required();


const updatePlayerDetailsSchema: any = joi.object({
  email: joi.string().trim().email(),
  firstName: joi.string().trim().trim(),
  lastName: joi.string().trim().trim(),
  address: joi.string().trim().trim(),
  postCode: joi.string().trim().trim(),
  city: joi.string().trim().trim(),
  countryId: joi.string().trim().length(2).uppercase(),
  dateOfBirth: joi.date().iso(),
  mobilePhone: joi.string().trim().trim(),
  languageId: joi.string().trim().length(2).lowercase(),
  nationalId: joi.string().trim().optional().allow(null),
  allowEmailPromotions: joi.boolean(),
  allowSMSPromotions: joi.boolean(),
  tcVersion: joi.number(),
  emailStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  mobilePhoneStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  placeOfBirth: joi.string().trim().allow(null),
  nationality: joi.string().trim().length(2).uppercase().allow(null),
  additionalFields: joi.object().allow(null),
  realityCheckMinutes: joi.number().integer().positive().allow(0).min(15).max(480).default(60),
});


const playerDraftSchema: any = joi.object({
  email: joi.string().trim().email().required(),
  password: joi.string().trim().min(8).required(),
  firstName: joi.string().trim().trim().required(),
  lastName: joi.string().trim().trim().required(),
  address: joi.string().trim().trim().required(),
  postCode: joi.string().trim().trim().required(),
  city: joi.string().trim().trim().required(),
  countryId: joi.string().trim().length(2).required(),
  dateOfBirth: joi.date().iso().required(),
  mobilePhone: joi.string().trim().trim().required(),
  languageId: joi.string().trim().length(2).required().lowercase(),
  nationalId: joi.string().trim().optional().allow(null),
  currencyId: joi.string().trim().length(3).required().uppercase(),
  affiliateRegistrationCode: joi.string().trim(),
  allowSMSPromotions: joi.boolean().default(true),
  allowEmailPromotions: joi.boolean().default(true),
  activated: joi.boolean().default(false),
  gamblingProblem: joi.boolean().default(false),
  ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
  userAgent: joi.string().trim(),
  registrationSource: joi.string().trim(),
  tcVersion: joi.number(),
  emailStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  mobilePhoneStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  placeOfBirth: joi.string().trim().allow(null),
  nationality: joi.string().trim().length(2).uppercase().allow(null),
  additionalFields: joi.object().allow(null),
}).required();

const resetPasswordSchema: any = joi.object({
  newPassword: joi.string().trim().required(),
}).required();

const requestPasswordRequestSchema: any = joi.object({
  email: joi.string().trim().lowercase().email(),
  dateOfBirth: joi.string().trim(),
}).required();


const requestPasswordResetSchema: any = joi.alternatives().try(
  joi.object({
    email: joi.string().trim().lowercase().email().required(),
    dateOfBirth: joi.date().iso().optional(),
  }).required().options({ stripUnknown: true }),
  joi.object({
    mobilePhone: joi.string().trim().trim().required(),
    dateOfBirth: joi.date().iso().optional(),
  }).required().options({ stripUnknown: true }),
);

const completePasswordResetSchema: any = joi.alternatives().try(
  joi.object({
    email: joi.string().trim().lowercase().email().required(),
    pinCode: joi.string().trim().required(),
    newPassword: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
  joi.object({
    mobilePhone: joi.string().trim().trim().required(),
    pinCode: joi.string().trim().required(),
    newPassword: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
);

const requestPlayerRegistrationSchema: any = joi.object().keys({
  mobilePhone: joi.string().trim().trim().required(),
});

const completePlayerRegistrationSchema: any = joi.object().keys({
  playerDraft: playerDraftSchema,
  mobilePhone: joi.string().trim().trim().required(),
  pinCode: joi.string().trim().required(),
});

const queryPlayerSchema: any = joi.object({
  email: joi.string().trim().lowercase().email(),
  mobilePhone: joi.string().trim(),
}).or('email', 'mobilePhone');

const addPlayerNoteSchema: any = joi.object({
  content: joi.string().trim().required(),
});

const activateAccountQuerySchema: any = joi.object().keys({
  brandId: joi.string().trim().required(),
  activationCode: joi.string().trim().guid().required(),
});

const activateAccountBodySchema: any = joi.object().keys({
  ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }),
});

const activateViaEmailVerificationBodySchema: any = joi.object().keys({
  ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }),
  username: joi.string().trim().required(),
});

const tagSchema: any = joi.object({
  tag: joi.string().trim().required(),
});

module.exports = {
  changePasswordSchema,
  setPasswordSchema,
  updatePlayerDetailsSchema,
  playerDraftSchema,
  resetPasswordSchema,
  requestPasswordRequestSchema,
  requestPasswordResetSchema,
  completePasswordResetSchema,
  requestPlayerRegistrationSchema,
  completePlayerRegistrationSchema,
  queryPlayerSchema,
  addPlayerNoteSchema,
  activateAccountQuerySchema,
  activateAccountBodySchema,
  activateViaEmailVerificationBodySchema,
  tagSchema,
};
