// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../user-roles');
const { affmoreBrandIds } = require('../../../../types/constants');

const getAffiliatesOverviewSchema: any = joi.object().keys({
  params: joi.object().keys({
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
    includeInternals: joi.boolean().optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateAffiliateSchema: any = joi.object().keys({
  session: joi.object().keys({
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
  affiliate: joi.object().keys({
    name: joi.string().trim().optional(),

    contactName: joi.string().trim().optional(),
    email: joi.string().trim().email().optional(),
    countryId: joi.string().trim().length(2).uppercase().allow('').allow(null).optional(),
    address: joi.string().trim().allow('').allow(null).optional(),
    phone: joi.string().trim().allow('').allow(null).optional(),
    skype: joi.string().trim().allow('').allow(null).optional(),
    vatNumber: joi.string().trim().allow('').allow(null).optional(),
    info: joi.string().trim().allow('').allow(null).optional(),
    allowEmails: joi.boolean().optional(),

    paymentMinAmount: joi.number().integer().optional(),
    paymentMethod: joi.string().trim().valid('banktransfer', 'skrill', 'casinoaccount').optional(),
    paymentMethodDetails: joi.when('paymentMethod', {
      is: joi.string().trim().valid('banktransfer'),
      then: joi.object({
        bankPostCode: joi.string().trim().optional().allow(''),
        bankCountry: joi.string().trim().optional().allow(''),
        bankClearingNumber: joi.string().trim().optional().allow(''),
        bankBic: joi.string().trim().optional().allow(''),
        bankIban: joi.string().trim().optional().allow(''),
        bankAddress: joi.string().trim().optional().allow(''),
        bankName: joi.string().trim().optional().allow(''),
        bankAccountHolder: joi.string().trim().optional().allow(''),
      }).optional().options({ stripUnknown: true }),
      otherwise: joi.when('paymentMethod', {
        is: joi.string().trim().valid('skrill'),
        then: joi.object({
          skrillAccount: joi.string().trim().required(),
        }).optional().options({ stripUnknown: true }),
        otherwise: joi.when('paymentMethod', {
          is: joi.string().trim().valid('casinoaccount'),
          then: joi.object({
            casinoAccountEmail: joi.string().trim().required(),
          }).optional().options({ stripUnknown: true }),
          otherwise: joi.forbidden(),
        }),
      }),
    }),

    floorBrandCommission: joi.boolean().optional(),
    allowNegativeFee: joi.boolean().optional(),
    allowPayments: joi.boolean().optional(),
    isInternal: joi.boolean().optional(),
    isClosed: joi.boolean().optional(),
    userId: joi.number().integer().allow(null).optional(),
    masterId: joi.number().integer().allow(null).optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateOverviewSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliatePlayersRevenuesSchema: any = joi.object().keys({
  params: joi.object().keys({
    affiliateId: joi.number().integer().required(),
    year: joi.number().integer().optional(),
    month: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }),
}).options({ stripUnknown: true });

module.exports = {
  getAffiliateSchema,
  getAffiliatesOverviewSchema,
  updateAffiliateSchema,
  getAffiliateOverviewSchema,
  getAffiliatePlayersRevenuesSchema,
};
