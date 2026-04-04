// @flow
const joi = require('gstech-core/modules/joi');

const accountDocumentSchema: any = joi.alternatives().try(
  joi.object().keys({
    photoId: joi.string().trim().required(),
    name: joi.string().trim().required(),
    expiryDate: joi.date().iso().allow(null),
    content: joi.string().trim().allow(null),
  }),
  joi.object().keys({
    photoId: joi.string().trim().allow(null),
    name: joi.string().trim().allow(null),
    expiryDate: joi.date().iso().allow(null),
    content: joi.string().trim().required(),
  }),
);

const accountSchema: any = joi.object().keys({
  method: joi.string().trim().required(),
  account: joi.string().trim().required(),
  accountHolder: joi.string().trim().allow(null),
  kycChecked: joi.boolean().required(),
  parameters: joi.object().allow(null).default({}),
  documents: joi.array().items(accountDocumentSchema),
});

const updateAccountSchema: any = joi.object({
  active: joi.boolean(),
  withdrawals: joi.boolean(),
  kycChecked: joi.boolean(),
  account: joi.string().trim(),
  accountHolder: joi.string().trim().allow(null),
  parameters: joi.object().allow(null).default({}),
});

const updateAccountParametersSchema: any = joi.object({
  parameters: joi.object().allow(null).default({}),
});

const updateAccountDocumentSchema: any = joi.object({
  content: joi.string().trim().allow(null),
  expiryDate: joi.date().iso().allow(null),
});

const updateAccountHolderSchema: any = joi.object({
  accountHolder: joi.string().trim().required(),
});

module.exports = {
  accountDocumentSchema,
  accountSchema,
  updateAccountDocumentSchema,
  updateAccountSchema,
  updateAccountHolderSchema,
  updateAccountParametersSchema,
};
