/* @flow */

const joi = require('gstech-core/modules/joi');

const addCampaignContent: any = joi.object().keys({
  sendingTime: joi
    .string().trim()
    .regex(/^([01]\d|2[0123]):[012345]\d:00\+[01]\d$/, 'time')
    .optional(),
  contentId: joi.number().required(),
  sendToAll: joi.boolean().optional().default(false),
});

module.exports = {
  addCampaignContent,
};
