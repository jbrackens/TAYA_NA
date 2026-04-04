// @flow
const joi = require('gstech-core/modules/joi');
const { affmoreBrandIds } = require('../../../types/constants');

const getAffiliateSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateAffiliateSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  affiliate: joi.object().keys({
    name: joi.string().trim().required(),

    contactName: joi.string().trim().optional(),
    email: joi.string().trim().email().optional(),
    countryId: joi.string().trim().length(2).uppercase().allow('').allow(null).optional(),
    address: joi.string().trim().allow('').allow(null).optional(),
    phone: joi.string().trim().allow('').allow(null).optional(),
    skype: joi.string().trim().allow('').allow(null).optional(),
    vatNumber: joi.string().trim().allow('').allow(null).optional(),
    info: joi.string().trim().allow('').allow(null).optional(),
    allowEmails: joi.boolean().optional(),

    paymentMinAmount: joi.number().integer().required(),
    paymentMethod: joi.string().trim().valid('banktransfer', 'skrill', 'casinoaccount').required(),
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
      }).required().options({ stripUnknown: true }),
      otherwise: joi.when('paymentMethod', {
        is: joi.string().trim().valid('skrill'),
        then: joi.object({
          skrillAccount: joi.string().trim().required(),
        }).required().options({ stripUnknown: true }),
        otherwise: joi.when('paymentMethod', {
          is: joi.string().trim().valid('casinoaccount'),
          then: joi.object({
            casinoAccountEmail: joi.string().trim().required(),
          }).required().options({ stripUnknown: true }),
          otherwise: joi.forbidden(),
        }),
      }),
    }),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateOverviewSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliatePlayersRevenuesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    year: joi.number().integer().optional(),
    month: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }),
}).options({ stripUnknown: true });

const getAffiliateDealsSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateAdminFeesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const createAffiliateLinkSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  link: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).required(),
    name: joi.string().trim().required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateLinksSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }),
}).options({ stripUnknown: true });

const getAffiliateLinkClicksSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    from: joi.string().trim().required(), // TODO: mandatory inputs must be params
    to: joi.string().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const updateAffiliateLinkSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  link: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
    name: joi.string().trim().required(),
    landingPage: joi.string().trim().uri().trim().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const deleteAffiliateLinkSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    linkId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getLandingsSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliatePlayerActivitiesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    playerId: joi.number().integer().required(),
    year: joi.number().integer().optional(),
    month: joi.number().integer().optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliatePaymentsSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getSubAffiliatesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  params: joi.object().keys({
    year: joi.number().integer().required(),
    month: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const createChildAffiliateSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  affiliate: joi.object().keys({
    email: joi.string().trim().email().required(),
    name: joi.string().trim().required(),
    info: joi.string().trim().optional().allow(''),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getChildrenAffiliatesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateActivitiesSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
  query: joi.object().keys({
    from: joi.string().trim().required(),
    to: joi.string().trim().required(),
    brandId: joi.string().trim().valid(...affmoreBrandIds).optional(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateAPIKeySchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const getAffiliateAPITokenSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

const refreshAffiliateAPITokenSchema: any = joi.object().keys({
  session: joi.object().keys({
    affiliateId: joi.number().integer().required(),
  }).required().options({ stripUnknown: true }),
}).options({ stripUnknown: true });

module.exports = {
  getAffiliateSchema,
  updateAffiliateSchema,
  getAffiliateOverviewSchema,
  getAffiliatePlayersRevenuesSchema,
  getAffiliateDealsSchema,
  getAffiliateAdminFeesSchema,
  createAffiliateLinkSchema,
  getAffiliateLinksSchema,
  getAffiliateLinkClicksSchema,
  updateAffiliateLinkSchema,
  deleteAffiliateLinkSchema,
  getLandingsSchema,
  getAffiliatePlayerActivitiesSchema,
  getAffiliatePaymentsSchema,
  getSubAffiliatesSchema,
  createChildAffiliateSchema,
  getChildrenAffiliatesSchema,
  getAffiliateActivitiesSchema,
  getAffiliateAPIKeySchema,
  getAffiliateAPITokenSchema,
  refreshAffiliateAPITokenSchema,
};
