/* @flow */
const joi = require('gstech-core/modules/joi');

const addContentEventSchema: Joi$ObjectSchema<> = joi
  .object()
  .keys({
    text: joi.string().trim().required(),
    contentId: joi.number().required(),
    extras: joi.object().optional(),
  })
  .options({ stripUnknown: true });

const addRewardRuleSchema: Joi$ObjectSchema<> = joi
  .object()
  .keys({
    trigger: joi.string().trim().required().valid('deposit', 'registration', 'login', 'instant'),
    rewardId: joi.number().optional().allow(null),
    wager: joi.when('trigger', {
      is: 'deposit',
      then: joi.number().required(),
      otherwise: joi.number().optional().default(0),
    }),
    useOnCredit: joi.boolean().optional().default(false),
    minDeposit: joi.number().when('trigger', {
      is: 'deposit',
      then: joi.number().required(),
    }),
    maxDeposit: joi.number().optional(),
    quantity: joi.number().required(),
    titles: joi.object().when('trigger', {
      is: 'deposit',
      then: joi
        .object()
        .required()
        .pattern(
          joi.string().trim().length(2),
          joi.object({
            text: joi.string().trim().required().allow(''),
            required: joi.boolean().default(false).optional(),
          }),
        ),
      otherwise: joi.object().optional().default({}),
    }),
  })
  .options({ stripUnknown: true });

const createCampaignSchema: Joi$ObjectSchema<> = joi
  .object()
  .keys({
    brandId: joi.string().trim().brandId().required(),
    creditMultiple: joi.boolean().required(),
    name: joi.string().trim().required(),
    startTime: joi.date().allow(null),
    endTime: joi.date().allow(null),
    audienceType: joi.string().trim().valid('dynamic', 'static').required(),
    groupId: joi.number().integer().optional().min(1),
  })
  .options({ stripUnknown: true });

const updateCampaignSchema: Joi$ObjectSchema<> = joi
  .object()
  .keys({
    brandId: joi.string().trim().brandId(),
    creditMultiple: joi.boolean(),
    name: joi.string().trim(),
    startTime: joi.date().allow(null),
    endTime: joi.date().allow(null),
    audienceType: joi.string().trim().valid('dynamic', 'static'),
    groupId: joi.number().integer().optional().min(1),
  })
  .options({ stripUnknown: true });

const getCampaignsSchema: Joi$ObjectSchema<{
  campaignStatus: 'draft' | 'running' | 'active' | 'archived',
  brandId?: BrandId,
  pageSize?: number,
  pageIndex: number,
}> = joi
  .object({
    brandId: joi.string().trim().brandId().optional(),
    campaignStatus: joi.string().trim().valid('draft', 'running', 'active', 'archived').optional(),
    pageSize: joi.number().integer().optional(),
    pageIndex: joi.number().integer().default(1).optional(),
  })
  .options({ stripUnknown: true });

const getCsvAudienceQuerySchema: Joi$ObjectSchema<> = joi
  .object()
  .keys({
    type: joi
      .string().trim()
      .valid('', 'email', 'sms')
      .optional(),
  })
  .options({ stripUnknown: true });

module.exports = {
  addContentEventSchema,
  addRewardRuleSchema,
  createCampaignSchema,
  updateCampaignSchema,
  getCampaignsSchema,
  getCsvAudienceQuerySchema,
};
