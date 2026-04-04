/* @flow */

const joi = require('gstech-core/modules/joi');

const createRewardSchema: any = joi
  .object({
    rewardDefinitionId: joi.number().required(),
    creditType: joi.string().trim().required(),
    externalId: joi.string().trim().required(),
    order: joi.number().optional(),
    bonusCode: joi.string().trim().when('creditType', {
      is: joi.string().trim().valid('freeSpins', 'real', 'bonus'),
      then: joi.string().trim().required(),
      otherwise: joi.string().trim().optional().default(''),
    }),
    description: joi.string().trim().optional().default(''),
    validity: joi.string().trim().isoDate().optional().allow(null).default(null),
    price: joi.number().when('currency', {
      is: joi.string().trim(),
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    cost: joi.number().optional().allow(null).default(null),
    spins: joi.number().when('creditType', {
      is: 'freeSpins',
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    spinValue: joi.number().optional().allow(null).default(null),
    spinType: joi.string().trim().optional().allow(null).default(null),
    gameId: joi.when('creditType', {
      is: 'freeSpins',
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    currency: joi.string().trim().optional().allow(null).default(null),
    metadata: joi.object().optional().allow(null).default({}),
    active: joi.boolean().optional().default(true),
  })
  .options({ stripUnknown: true });

const getRewardsSchema: any = joi
  .object({
    type: joi.string().trim().optional(),
    group: joi.string().trim().optional(),
    removed: joi.boolean().optional(),
    brandId: joi.string().trim().brandId().required(),
  })
  .or('type', 'group')
  .options({ stripUnknown: true });

const updateRewardSchema: any = joi
  .object({
    rewardDefinitionId: joi.number().optional(),
    creditType: joi.string().trim().valid('freeSpins', 'real', 'bonus').optional(),
    externalId: joi.string().trim().optional(),
    order: joi.number().optional(),
    bonusCode: joi.string().trim().when('creditType', {
      is: ['freeSpins', 'real', 'bonus'],
      then: joi.string().trim().required(),
      otherwise: joi.string().trim().optional().default(''),
    }).optional(),
    description: joi.string().trim().optional().default(''),
    validity: joi.string().trim().isoDate().optional().allow(null).default(null),
    price: joi.number().when('currency', {
      is: joi.string().trim(),
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    cost: joi.number().optional().allow(null).default(null),
    spins: joi.number().when('creditType', {
      is: 'freeSpins',
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    spinValue: joi.number().optional().allow(null).default(null),
    spinType: joi.string().trim().optional().allow(null).default(null),
    gameId: joi.when('creditType', {
      is: 'freeSpins',
      then: joi.number().required(),
      otherwise: joi.number().optional().allow(null).default(null),
    }),
    currency: joi.string().trim().optional().allow(null).default(null),
    metadata: joi.object().optional().allow(null).default(null),
  })
  .options({ stripUnknown: true });

module.exports = {
  createRewardSchema,
  getRewardsSchema,
  updateRewardSchema,
};
