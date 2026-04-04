// @flow
const joi = require('gstech-core/modules/joi');
const userRoles = require('../../../user-roles');

const adminFeeRequestSchema: any = joi
  .object()
  .keys({ adminFeeId: joi.number().integer().required() })
  .options({ stripUnknown: true });

const deleteAdminFeeRequestSchema: any = joi
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
      .keys({
        adminFeeId: joi.number().integer().required(),
      })
      .required()
      .options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

const createAdminFeeSchema: any = joi
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
    fee: joi
      .object({
        name: joi.string().trim().max(255).required(),
        percent: joi.number().integer().required().default(25),
        active: joi.boolean().optional(),
      })
      .required()
      .options({ stripUnknown: true }),
    rules: joi
      .array()
      .items(
        joi.object({
          countryId: joi.string().trim().length(2).uppercase().optional(),
          percent: joi.number().integer().required().default(25),
        }),
      )
      .required()
      .options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

const updateAdminFeeSchema: any = joi
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
      .keys({
        adminFeeId: joi.number().integer().required(),
      })
      .required()
      .options({ stripUnknown: true }),
    fee: joi
      .object({
        percent: joi.number().integer().required(),
        name: joi.string().trim().max(255).required(),
        active: joi.boolean().optional(),
      })
      .required()
      .options({ stripUnknown: true }),
    rules: joi
      .array()
      .items(
        joi.object({
          countryId: joi.string().trim().length(2).uppercase().required(),
          percent: joi.number().integer().required(),
        }),
      )
      .required()
      .options({ stripUnknown: true }),
  })
  .options({ stripUnknown: true });

module.exports = {
  createAdminFeeSchema,
  updateAdminFeeSchema,
  adminFeeRequestSchema,
  deleteAdminFeeRequestSchema,
};
