/* @flow */

const campaClient = require('gstech-core/modules/clients/campaignserver-api');
const backendClient = require('gstech-core/modules/clients/backend-bonus-api');
const logger = require('gstech-core/modules/logger');
const errors = require('gstech-core/modules/errors/error-codes');
const joi = require('joi');
const validate = require('gstech-core/modules/validate');

const { handleError } = require('../extensions');
const configuration = require('../configuration');

type PlayerIdOrToken = { playerId: Id } | { token: string };

const manageSubscriptionsSchema = joi.object({
  emails: joi.string().trim().valid('all', 'none', 'best_offers', 'new_games'),
  smses: joi.string().trim().valid('all', 'none', 'best_offers', 'new_games'),
}).or('emails', 'smses').options({ stripUnknown: true });

const snoozeSubscriptionsSchema = joi.object({
  type: joi.string().trim().valid('email', 'sms').required(),
  revertSnooze: joi.boolean().optional().default(false),
}).options({ stripUnknown: true });


const getPlayer = (req: express$Request): PlayerIdOrToken => {
  const { token } = req.query;
  if (token) {
    return { token: String(token) };
  }
  if (req.context.playerId) {
    return { playerId: req.context.playerId };
  }
  throw errors.SESSION_EXPIRED;
};

const manageSubscriptions = async (req: express$Request, body: any) => {
  const player = getPlayer(req);
  const response = await campaClient.getPlayerSubscriptionOptions(player);
  if (response) {
    await campaClient.updatePlayerSubscriptionOptions(player, body);
    const updatePlayer = {
      allowEmailPromotions: body.emails && body.emails !== 'none',
      allowSMSPromotions: body.smses && body.smses !== 'none',
    };
    await backendClient.updatePlayerDetails(
      configuration.shortBrandId(),
      response.playerId,
      updatePlayer,
    );
    return { ok: true };
  }

  logger.error('manageSubscriptions', response.error);
  return { ok: false };
};

const getSubscriptionsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const player = getPlayer(req);
    const data = await campaClient.getPlayerSubscriptionOptions(player);
    if (data) return res.json(data);
    return res.json({ ok: false });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const snoozeSubscriptionsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { type, revertSnooze } = validate(req.body, snoozeSubscriptionsSchema, 'snooze subscriptions schema validation failed');
    const player = getPlayer(req);
    const data = await campaClient.snoozePlayerSubscription(player, type, revertSnooze);
    if (data) return res.json(data);
    return res.json({ ok: false });
  } catch (e) {
    return handleError(req, res, e);
  }
};

const manageSubscriptionsHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const body = validate(req.body, manageSubscriptionsSchema, 'manage subscriptions schema validation failed');
    const r = await manageSubscriptions(req, body);
    return res.json(r);
  } catch (e) {
    return handleError(req, res, e);
  }
}

module.exports = {
  manageSubscriptionsHandler,
  snoozeSubscriptionsHandler,
  getSubscriptionsHandler,
};
