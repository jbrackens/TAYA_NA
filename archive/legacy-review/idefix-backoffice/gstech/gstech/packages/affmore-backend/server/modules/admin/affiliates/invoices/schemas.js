// @flow
const joi = require('gstech-core/modules/joi');
const { paymentTypes } = require('../../../../payment-types');
const userRoles = require('../../../../user-roles');

const createAffiliatePaymentSchema: any = joi.object().keys({
  session: joi.object({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  payment: joi.object().keys({
    type: joi.string().trim().valid(...paymentTypes).required(),
    description: joi.string().trim().required(),
    amount: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateInvoicesSchema: any = joi.object().keys({
  session: joi.object({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateInvoiceDraftSchema: any = joi.object().keys({
  session: joi.object({
    user: joi.object({
      id: joi.number().integer().required(),
      roles: joi
        .array()
        .items(joi.string().trim().valid(...userRoles).required())
        .required()
        .options({ stripUnknown: true }),
    }).required().options({ stripUnknown: true }),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
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
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    invoiceId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const confirmAffiliateInvoiceSchema: any = joi.object().keys({
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
}).options({ stripUnknown: true });

const markAffiliateInvoiceAsPaidSchema: any = joi.object().keys({
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

const createAffiliateInvoiceAttachmentSchema: any = joi.object().keys({
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

const getAffiliateInvoiceAttachmentSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    invoiceId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  createAffiliatePaymentSchema,
  getAffiliateInvoicesSchema,
  getAffiliateInvoiceDraftSchema,
  getAffiliateInvoiceSchema,
  confirmAffiliateInvoiceSchema,
  markAffiliateInvoiceAsPaidSchema,
  createAffiliateInvoiceAttachmentSchema,
  getAffiliateInvoiceAttachmentSchema,
};
