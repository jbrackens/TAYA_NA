/* @flow */

const joi = require('gstech-core/modules/joi');

const addAudienceRuleSchema: any = joi
  .object()
  .keys({
    name: joi
      .string()
      .trim()
      .when('operator', {
        is: 'withinMinutes',
        then: joi
          .string()
          .trim()
          .valid('deposit', 'login', 'register', 'contact', 'addedToCampaign')
          .required(),
      })
      .when('operator', {
        is: joi
          .string()
          .trim()
          .valid('otherCampaignReward', 'otherCampaignsMember', 'csv', 'gameManufacturer'),
        then: joi.string().trim().allow(''),
        otherwise: joi
          .string()
          .trim()
          .valid(
            'numDeposits',
            'country',
            'player',
            'email',
            'tags',
            'segments',
            'campaignDeposit',
            'register',
            'deposit',
            'depositAmount',
            'totalDepositAmount',
            'login',
            'language',
            'landingPage',
          )
          .required(),
      })
      .required(),
    operator: joi
      .string()
      .trim()
      .valid(
        '<',
        '<=',
        '>',
        '>=',
        '!=',
        '<>',
        '=',
        'between',
        'csv',
        'in',
        'withinMinutes',
        'otherCampaignReward',
        'otherCampaignsMember',
        'gameManufacturer',
      )
      .required(),
    values: joi
      .when('operator', {
        is: 'withinMinutes',
        then: joi.number().required(),
        break: true,
      })
      .when('operator', {
        is: 'otherCampaignReward',
        then: joi
          .object({
            campaignId: joi.number().required().allow(null),
            rewardId: joi.number().required().allow(null),
          })
          .required(),
        break: true,
      })
      .when('operator', {
        is: 'otherCampaignsMember',
        then: joi
          .object({
            campaignIds: joi.array().items(joi.number()).required(),
            complete: joi.boolean().optional(),
            failed: joi.boolean().optional(),
            state: joi.string().trim().valid('any', 'complete', 'incomplete', 'expired').optional(),
            withinMinutes: joi.number().optional(),
            not: joi.boolean().optional(),
          })
          .required(),
        break: true,
      })
      .when('operator', {
        is: joi.string().trim().valid('between', 'csv', 'in'),
        then: joi.array().items(joi.any()).required(),
        otherwise: joi.alternatives().try(joi.string().trim(), joi.number()).required(),
      })
      .required(),
    not: joi.boolean().optional(),
  })
  .options({ stripUnknown: true });

module.exports = {
  addAudienceRuleSchema,
};
