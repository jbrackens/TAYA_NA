/* @flow */

const joi = require('gstech-core/modules/joi');

const updatePaymentProviderDetailsSchema: any = joi
  .object({
    deposits: joi.boolean().optional(),
    withdrawals: joi.boolean().optional(),
    active: joi.boolean().optional(),
    priority: joi.number().integer().optional(),
    blockCountries: joi.boolean().optional(),
    countries: joi
      .array()
      .items(
        joi.object({ brandId: joi.string().trim().brandId().required(), id: joi.string().trim().required() }),
      ),
    currencies: joi.array().items(
      joi.object({
        brandId: joi.string().trim().brandId().required(),
        id: joi.string().trim().required(),
        minDeposit: joi.number().integer().required(),
        maxDeposit: joi.number().integer().required(),
        minWithdrawal: joi.number().integer().required(),
        maxWithdrawal: joi.number().integer().required(),
        maxPendingDeposits: joi.number().integer().optional().allow(null),
      }),
    ),
  })
  .options({ stripUnknown: true });

module.exports = {
  updatePaymentProviderDetailsSchema,
};
