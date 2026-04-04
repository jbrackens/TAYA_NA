// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../../user-roles');
const { affmoreBrandIds } = require('../../../../../types/constants');

const getAffiliateAdminFeesSchema: any = joi
  .object()
  .keys({
    params: joi
      .object()
      .keys({
        affiliateId: joi.number().integer().required(),
      })
      .required()
      .options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

const updateAffiliateAdminFeesSchema: any = joi
  .object()
  .keys({
    session: joi
      .object()
      .keys({
        user: joi
          .object({
            id: joi.number().integer().required(),
            roles: joi
              .array()
              .items(
                joi
                  .string()
                  .trim()
                  .valid(...userRoles)
                  .required(),
              )
              .required()
              .options({ stripUnknown: true }),
          })
          .required()
          .options({ stripUnknown: true }),
      })
      .required()
      .options({ stripUnknown: true }),
    params: joi
      .object()
      .keys({ affiliateId: joi.number().integer().required() })
      .required()
      .options({ stripUnknown: true }),
    brandId: joi
      .string()
      .trim()
      .valid(...affmoreBrandIds)
      .required(),
    fees: joi
      .array()
      .items(
        joi.object().keys({
          affiliateFeeId: joi.number().integer().optional(),
          adminFeeId: joi.number().integer().required(),
          brandId: joi
            .string()
            .trim()
            .valid(...affmoreBrandIds)
            .required(),
          periodFrom: joi.date().required(),
          periodTo: joi.date().required(),
        }),
      )
      .required()
      .options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

module.exports = {
  getAffiliateAdminFeesSchema,
  updateAffiliateAdminFeesSchema,
};
