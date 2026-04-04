// @flow
const joi = require('gstech-core/modules/joi');

module.exports = {
  bonusSchema: (joi
    .object()
    .keys({
      brandId: joi.string().trim().allow(null),
      name: joi.string().trim().required(),
      active: joi.boolean().required(),
      archived: joi.boolean(),
      wageringRequirementMultiplier: joi.number().required(),
      creditOnce: joi.boolean().required(),
      depositBonus: joi.boolean().default(false).required(),
      depositCount: joi.number().allow(null),
      depositCountMatch: joi.boolean().allow(null),
      depositMatchPercentage: joi.number().allow(null),
      daysUntilExpiration: joi.number().allow(null),
    })
    .when('.depositBonus', {
      is: true,
      then: joi.object({
        depositCount: joi.required(),
        depositCountMatch: joi.boolean().required(),
        depositMatchPercentage: joi.required(),
      }),
    }): any),
  bonusLimitsSchema: (joi
    .array()
    .items(
      joi.object({
        currencyId: joi.string().trim().required(),
        minAmount: joi.number().allow(null).required(),
        maxAmount: joi.number().allow(null).required(),
      }),
    )
    .required(): any),
  playerBonusSchema: (joi.object({
    expiryDate: joi.date().iso().min('now').optional(),
    id: joi.string().trim().required(),
    amount: joi.number().positive().integer().required(),
  }): any),
};
