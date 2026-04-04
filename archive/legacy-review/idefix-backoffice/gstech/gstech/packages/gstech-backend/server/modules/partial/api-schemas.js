/* @flow */
const joi = require('gstech-core/modules/joi');

const failPartialLoginSchema: any = joi.object({
  brandId: joi.string().trim().length(2),
  transactionKey: joi.string().trim().guid().required(),
  parameters: joi.object().optional(),
})

const getPartialLoginSchema: any = joi.object({
  brandId: joi.string().trim().length(2),
  transactionKey: joi.string().trim().guid().required(),
  status: joi.string().trim().valid('started', 'verified', 'completed', 'failed').optional(),
})

const startPayAndPlayDepositSchema: any = joi.object({
  transactionKey: joi.string().trim().guid().required(),
  paymentMethod: joi.string().trim().required(),
  amount: joi.number().positive().allow(0).integer().required(),
  bonusId: joi.number().allow(null).integer().optional(),
  player: joi.object({
    languageId: joi.string().trim().length(2).required().lowercase(),
    currencyId: joi.string().trim().length(3).required().uppercase(),
    countryId: joi.string().trim().length(2),
    affiliateRegistrationCode: joi.string().trim(),
    ipAddress: joi.string().trim().ip({ version: ['ipv4', 'ipv6'], cidr: 'forbidden' }).required(),
    registrationSource: joi.string().trim(),
    tcVersion: joi.number().required(),
  }).required(),
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

const partialPlayerSchema = joi.object({
  nationalId: joi.string().trim().trim().allow(null),
  email: joi.string().trim().email(),
  firstName: joi.string().trim().trim(),
  lastName: joi.string().trim().trim(),
  address: joi.string().trim().trim(),
  postCode: joi.string().trim().trim(),
  city: joi.string().trim().trim(),
  countryId: joi.string().trim().length(2),
  dateOfBirth: joi.date().iso(),
  mobilePhone: joi.string().trim().trim(),
  affiliateRegistrationCode: joi.string().trim(),
  allowSMSPromotions: joi.boolean(),
  allowEmailPromotions: joi.boolean(),
  activated: joi.boolean(),
  gamblingProblem: joi.boolean(),
  emailStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  mobilePhoneStatus: joi.string().trim().valid('unknown', 'unverified', 'verified', 'failed'),
  placeOfBirth: joi.string().trim().allow(null),
  nationality: joi.string().trim().length(2).uppercase().allow(null),
  additionalFields: joi.object().allow(null),
});

const registerPartialPlayerSchema: any = joi.object({
  transactionKey: joi.string().trim().required(),
  player: partialPlayerSchema.required(),
}).required();

const updatePartialPlayerSchema: any = partialPlayerSchema.required();

const completePlayerRegistrationSchema: any = partialPlayerSchema.append({
  email: joi.string().trim().email().required(),
  mobilePhone: joi.string().trim().trim().required(),
  allowEmailPromotions: joi.boolean().required(),
  allowSMSPromotions: joi.boolean().required(),
}).required();

module.exports = {
  failPartialLoginSchema,
  getPartialLoginSchema,
  startPayAndPlayDepositSchema,
  registerPartialPlayerSchema,
  completePlayerRegistrationSchema,
  updatePartialPlayerSchema,
};
