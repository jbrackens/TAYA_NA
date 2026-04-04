// @flow
const joi = require('gstech-core/modules/joi');

const registerSchema: any = joi.object().keys({
  affiliate: joi.object().keys({
    email: joi.string().trim().email().required(),
    password: joi.string().trim().min(8).required(),

    paymentMethod: joi.string().trim().valid('banktransfer', 'skrill', 'casinoaccount').required(),
    paymentMethodDetails: joi.when('paymentMethod', {
      is: joi.string().trim().valid('banktransfer'),
      then: joi.object({
        bankPostCode: joi.string().trim().optional(),
        bankCountry: joi.string().trim().optional(),
        bankClearingNumber: joi.string().trim().optional(),
        bankBic: joi.string().trim().optional(),
        bankIban: joi.string().trim().optional(),
        bankAddress: joi.string().trim().optional(),
        bankName: joi.string().trim().optional(),
        bankAccountHolder: joi.string().trim().optional(),
      }).optional().options({ stripUnknown: true }),
      otherwise: joi.when('paymentMethod', {
        is: joi.string().trim().valid('skrill'),
        then: joi.object({
          skrillAccount: joi.string().trim().optional(),
        }).required().options({ stripUnknown: true }),
        otherwise: joi.when('paymentMethod', {
          is: joi.string().trim().valid('casinoaccount'),
          then: joi.object({
            casinoAccountEmail: joi.string().trim().optional(),
          }).required().options({ stripUnknown: true }),
          otherwise: joi.forbidden(),
        }),
      }),
    }),

    name: joi.string().trim().required(),
    contactName: joi.string().trim().required(),
    countryId: joi.string().trim().length(2).uppercase().required(),
    address: joi.string().trim().required(),
    phone: joi.string().trim().optional().allow('').allow(null),
    skype: joi.string().trim().optional().allow('').allow(null),
    vatNumber: joi.string().trim().optional().allow('').allow(null),
    info: joi.string().trim().optional().allow('').allow(null),
    allowEmails: joi.boolean().default(true),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    referral: joi.number().integer().optional(),
  }).options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const loginSchema: any = joi.object().keys({
  email: joi.string().trim().email().required().lowercase(),
  password: joi.string().trim().required(),
}).options({ stripUnknown: true });

const acceptTCSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const passwordChangeSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  oldPassword: joi.string().trim().min(8).required(),
  newPassword: joi.string().trim().min(8).disallow(joi.ref('oldPassword')).required(),
}).options({ stripUnknown: true });

const passwordForgotSchema: any = joi.object().keys({
  email: joi.string().trim().email().required().lowercase(),
}).options({ stripUnknown: true });

const passwordUpdateSchema: any = joi.object().keys({
  email: joi.string().trim().email().required().lowercase(),
  pinCode: joi.string().trim().min(6).max(6).required(),
  newPassword: joi.string().trim().min(8).required(),
}).options({ stripUnknown: true });

module.exports = {
  registerSchema,
  loginSchema,
  acceptTCSchema,
  passwordChangeSchema,
  passwordForgotSchema,
  passwordUpdateSchema,
};
