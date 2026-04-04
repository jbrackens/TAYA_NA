// @flow
const joi = require('gstech-core/modules/joi');

const playerValidation: any = joi
  .object({
    token: joi.string().trim().uuid(),
    playerId: joi.number(),
  })
  .or('token', 'playerId')
  .options({ stripUnknown: true });

const getPlayerAvailableContent: any = joi.object({
  contentType: joi.string().trim().required(),
  playerId: joi.number().required(),
});

const getPlayerSentContentSchema: any = joi
  .object({
    pageSize: joi.number().integer().optional(),
    pageIndex: joi.number().integer().default(1).optional(),
  });

const updatePlayerSubscriptionOptionsSchema: any = joi
  .object({
    emails: joi.string().trim().valid('all', 'new_games', 'best_offers', 'none').optional(),
    smses: joi.string().trim().valid('all', 'new_games', 'best_offers', 'none').optional(),
  })
  .or('emails', 'smses')
  .options({ stripUnknown: true });

const snoozePlayerSubscriptionSchema: any = joi
  .object({
    type: joi.string().trim().valid('email', 'sms').required(),
    revertSnooze: joi.boolean().optional().default(false),
  })
  .options({ stripUnknown: true });

module.exports = {
  getPlayerAvailableContent,
  getPlayerSentContentSchema,
  updatePlayerSubscriptionOptionsSchema,
  snoozePlayerSubscriptionSchema,
  playerValidation,
};
