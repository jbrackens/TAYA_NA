// @flow
const joi = require('gstech-core/modules/joi');

const photoSchema = joi.object({
  id: joi.string().trim(),
  originalName: joi.string().trim(),
});

module.exports = {
  photosSchema: (joi.object({
    photos: joi.array().items(photoSchema),
    requestId: joi.number().allow(null).optional(),
    documentId: joi.number().allow(null).optional(),
  }): any),
  addContentDocumentSchema: (joi.object({
    content: joi.string().trim().required(),
    requestId: joi.number().allow(null).optional(),
    documentId: joi.number().allow(null).optional(),
  }): any),
  verifyKycDocumentSchema: (joi.object({
    type: joi.string().trim().valid('other', 'utility_bill', 'identification', 'payment_method', 'source_of_wealth').required(),
    expiryDate: joi.date().iso().allow(null),
    accountId: joi.number().allow(null),
    content: joi.string().trim().allow(null),
    fields: joi.object().allow(null),
  }): any),
  createDocumentSchema: (joi.object({
    type: joi.string().trim().valid('other', 'utility_bill', 'identification', 'payment_method', 'source_of_wealth').required(),
    content: joi.string().trim().optional(),
    photoId: joi.string().trim().allow(null).optional(),
    fields: joi.object().allow(null).optional(),
    source: joi.string().trim().optional(),
    accountId: joi.number().allow(null),
    status: joi.string().trim().valid('new', 'checked', 'outdated').default('new'),
  }).or('photoId', 'content'): any),
  kycRequestSchema: (joi.object({
    requestAutomatically: joi.boolean().default(false),
    note: joi.string().trim().allow(null).optional(),
    message: joi.string().trim().allow(null).optional(),
    documents: joi.array().items(joi.object({
      type: joi.string().trim().valid('other', 'utility_bill', 'identification', 'payment_method', 'source_of_wealth').required(),
      accountId: joi.number().optional().allow(null),
    })).required(),
  }): any),
  updateKycDocumentSchema: (joi.alternatives().try(
    joi.object().keys({
      type: joi.string().trim(),
      accountId: joi.number().allow(null),
      photoId: joi.string().trim().required(),
      expiryDate: joi.date().iso().allow(null),
      content: joi.string().trim().allow(null),
      name: joi.string().trim(),
      fields: joi.object().allow(null),
    }),
    joi.object().keys({
      type: joi.string().trim(),
      accountId: joi.number().allow(null),
      photoId: joi.string().trim().allow(null),
      expiryDate: joi.date().iso().allow(null),
      content: joi.string().trim().required(),
      name: joi.string().trim(),
      fields: joi.object().allow(null),
    }),
  ): any),
  identifySchema: (joi.object({
    paymentProvider: joi.string().trim().required(),
    urls: joi.object({
      ok: joi.string().trim().uri().required(),
      failure: joi.string().trim().uri().required(),
    }),
  }).required(): any),
};
