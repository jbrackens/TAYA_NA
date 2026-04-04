// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  updatePlayerSchema: (joi.object({
    email: joi.string().trim().email(),
    firstName: joi.string().trim(),
    lastName: joi.string().trim(),
    address: joi.string().trim(),
    postCode: joi.string().trim(),
    city: joi.string().trim(),
    countryId: joi.string().trim().length(2).uppercase(),
    dateOfBirth: joi.date().iso(),
    mobilePhone: joi.string().trim(),
    languageId: joi.string().trim().length(2).lowercase(),
    nationalId: joi.string().trim().allow('', null).empty(''),
    allowEmailPromotions: joi.boolean(),
    allowSMSPromotions: joi.boolean(),
    activated: joi.boolean(),
    testPlayer: joi.boolean(),
    placeOfBirth: joi.string().trim().allow(null),
    nationality: joi.string().trim().length(2).uppercase().allow(null),
    additionalFields: joi.object().allow(null),
    reason: joi.string().trim().optional(),
  }): any),
  searchPlayerSchema: (joi.object({
    query: joi.string().trim().allow(''),
    brandId: joi.string().trim().length(2),
    filters: joi.object(),
  }): any),
  suspendPlayerSchema: (joi.object({
    note: joi.string().trim().allow('').required(),
    reasons: joi.array().items(joi.string().trim().valid('multiple', 'fake', 'fraudulent', 'suspicious', 'ipcountry', 'gambling_problem', 'data_removal')).required(),
    accountClosed: joi.boolean().required(),
  }): any),
  updateAccountStatusSchema: (joi.object({
    verified: joi.boolean(),
    allowGameplay: joi.boolean(),
    preventLimitCancel: joi.boolean(),
    allowTransactions: joi.boolean(),
    loginBlocked: joi.boolean(),
    accountClosed: joi.boolean(),
    accountSuspended: joi.boolean(),
    gamblingProblem: joi.boolean(),
    riskProfile: joi.string().trim().valid('low', 'medium', 'high'),
    reason: joi.string().trim(),
    pep: joi.boolean(),
  }).min(1): any),
  addEventSchema: (joi.object({
    content: joi.string().trim().required(),
  }): any),
  tagSchema: (joi.object({
    tag: joi.string().trim().required(),
  }): any),
  campaignSearchSchema: (joi.object({
    brandId: joi.string().trim().length(2),
    operations: joi.array().items(joi.object({
      type: joi.string().trim().required(),
      operator: joi.string().trim().valid('<', '>', '=', '=<', '=>', 'between'),
      value: joi.any(),
      currency: joi.string().trim(),
      dates: joi.object({
        startDate: joi.date().iso(),
        endDate: joi.date().iso(),
      }),
      between: joi.object(),
    })).required(),
  }): any),
  updateStickyNoteSchema: (joi.object({
    content: joi.string().trim().required().allow(''),
  }): any),
  registerPlayerWithGamblingProblemSchema: (joi.object({
    player: joi.object({
      email: joi.string().trim().email().required(),
      firstName: joi.string().trim().trim().required(),
      lastName: joi.string().trim().trim().required(),
      address: joi.string().trim().trim().optional().allow(null).default(''),
      postCode: joi.string().trim().trim().optional().allow(null).default(''),
      city: joi.string().trim().trim().optional().allow().default(''),
      countryId: joi.string().trim().length(2).optional().allow(null).default('MT'),
      dateOfBirth: joi.date().iso().optional().allow(null).default('1900-01-01'),
      mobilePhone: joi.string().trim().trim().optional().allow(null).default('000'),
      nationalId: joi.string().trim().trim().optional().allow(null).default(''),
    }).options({ stripUnknown: true }).required(),
    note: joi.string().trim().default('').optional(), // TODO: or .required() ?
  }).options({ stripUnknown: true }).required(): any),
};
