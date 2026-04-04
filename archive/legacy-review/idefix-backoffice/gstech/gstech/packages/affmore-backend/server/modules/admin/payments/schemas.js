// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../user-roles');

const getAffiliatePaymentBalancesSchema: any = joi.object().keys({
    session: joi.object({
      user: joi.object({
        id: joi.number().integer().required(),
        roles: joi
          .array()
          .items(joi.string().trim().valid(...userRoles).required())
          .required()
          .options({ stripUnknown: true }),
      }).required().options({ stripUnknown: true }),
    }),
    query: joi.object().keys({
      year: joi.number().integer().required(),
      month: joi.number().integer().required(),
    }).required().options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

const getAffiliatePaymentBalanceSchema: any = joi.object().keys({
  session: joi.object({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateInvoiceSchema: any = joi.object().keys({
  session: joi.object({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    invoiceId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });



module.exports = {
  getAffiliatePaymentBalancesSchema,
  getAffiliatePaymentBalanceSchema,
  getAffiliateInvoiceSchema,
};
