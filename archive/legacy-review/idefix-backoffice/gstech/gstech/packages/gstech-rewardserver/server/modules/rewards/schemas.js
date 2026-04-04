/* @flow */
const joi = require('gstech-core/modules/joi');

const getAvailableRewardsSchema: any = joi.object({
  rewardType: joi.string().trim().optional(),
  externalId: joi.string().trim().optional(),
  group: joi.string().trim().optional(),
  excludeDisabled: joi.boolean().optional(),
}).options({ stripUnknown: true });

const creditRewardCore = {
  playerId: joi.number().integer().required(),
  source: joi.string().trim().valid('marketing', 'manual').default('marketing').optional(),
  externalLedgerId: joi.string().trim().optional(),
  count: joi.number().integer().min(1).default(1).optional(),
  comment: joi.string().trim().optional(),
};

const creditRewardSchema: any = joi.object().keys({
  rewardId: joi.number().required(),
  useOnCredit: joi.boolean().optional().default(false),
  ...creditRewardCore,
}).options({ stripUnknown: true });

const creditRewardByExternalIdSchema: any = joi
  .object({
    externalId: joi.string().trim().required(),
    rewardType: joi.string().trim().optional(),
    group: joi.string().trim().optional(),
    ...creditRewardCore,
  })
  .or('rewardType', 'group')
  .options({ stripUnknown: true });

const useRewardSchema: any = joi.object({
  rewardId: joi.number().integer().required(),
  playerId: joi.number().integer().required(),
}).options({ stripUnknown: true });


module.exports = {
  getAvailableRewardsSchema,
  creditRewardSchema,
  creditRewardByExternalIdSchema,
  useRewardSchema,
};
