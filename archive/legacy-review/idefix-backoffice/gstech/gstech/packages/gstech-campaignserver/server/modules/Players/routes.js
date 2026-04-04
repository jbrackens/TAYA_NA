// @flow
import type { GetPlayerSentContent } from 'gstech-core/modules/clients/campaignserver-api-types';
import type { GetPlayerAvailableContentResponse, GetPlayerSubscriptionOptionsResponse } from '../../../types/api';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const schemas = require('./schemas');
const contentRepository = require('../Content/repository');
const repository = require('./repository');

const getPlayerAvailableContent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getPlayerAvailableContent request', {
      params: req.params,
      query: req.query,
    });

    const playerId: Id = Number(req.params.playerId);
    const contentType: string = req.query['content-type'];

    validate(
      { playerId, contentType },
      schemas.getPlayerAvailableContent,
      'Incorrect content type',
    );

    const availableContent = await contentRepository.getPlayerAvailableContent(
      pg,
      playerId,
      contentType,
    );

    const response: DataResponse<GetPlayerAvailableContentResponse> = {
      data: availableContent,
    };
    return res.json(response);
  } catch (e) {
    logger.error('getPlayerAvailableContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerSentContent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getPlayerSentContent request', {
      params: req.params,
      query: req.query,
    });

    const { externalPlayerId }: { externalPlayerId: Id } = (req.params: any);
    const options = validate(req.query, schemas.getPlayerSentContentSchema);

    const sentContent: GetPlayerSentContent = await contentRepository.getPlayerSentContent(
      pg,
      externalPlayerId,
      options,
    );

    return res.json({ data: sentContent });
  } catch (e) {
    logger.error('getPlayerSentContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerSubscriptionOptions = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getPlayerSubscriptionOptions request', { body: req.body, params: req.params, query: req.query });

    const { token, playerId: externalId } = validate(
      req.query,
      schemas.playerValidation,
      `${req.query.token} is not a valid UUID`,
    );

    const player = await repository.getPlayer(pg, { subscriptionToken: token, externalId });
    if (!player) {
      return res.status(404).json({ error: { message: 'Player with given token not found' } });
    }

    let subscriptionOptions = await pg('subscription_options')
      .select('emails', 'smses', 'snoozeEmailsUntil', 'snoozeSmsesUntil')
      .where({ id: player.subscriptionOptionsId })
      .first();

    if (!subscriptionOptions) {
      subscriptionOptions = {
        emails: player.allowEmailPromotions ? 'all' : 'none',
        smses: player.allowSMSPromotions ? 'all' : 'none',
        snoozeEmailsUntil: null,
        snoozeSmsesUntil: null,
      };
    }
    const { snoozeEmailsUntil, snoozeSmsesUntil, ...rest } = subscriptionOptions;
    const response: DataResponse<GetPlayerSubscriptionOptionsResponse> = {
      data: {
        email: player.email,
        playerId: player.externalId,
        emailsSnoozed: snoozeEmailsUntil !== null,
        smsesSnoozed: snoozeSmsesUntil !== null,
        ...rest,
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('getPlayerSubscriptionOptions error', e, req.query);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updatePlayerSubscriptionOptions = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updatePlayerSubscriptionOptions request', { body: req.body, params: req.params });

    const { token, playerId: externalId } = validate(req.query, schemas.playerValidation);
    const subscriptionOptionsDraft = validate(
      req.body,
      schemas.updatePlayerSubscriptionOptionsSchema,
    );

    const player = await repository.getPlayer(pg, { subscriptionToken: token, externalId });
    if (!player) {
      return res.status(404).json({ error: { message: 'Player with given token not found' } });
    }

    await pg.transaction((tx) =>
      repository.createOrUpdatePlayerSubscriptionOptions(tx, player, subscriptionOptionsDraft),
    );

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('updatePlayerSubscriptionOptions error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const snoozePlayerSubscription = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('snoozePlayerSubscription request', { params: req.params });

    const { token, playerId: externalId } = validate(req.query, schemas.playerValidation);
    const { type, revertSnooze } = validate(req.body, schemas.snoozePlayerSubscriptionSchema);

    const player = await repository.getPlayer(pg, { subscriptionToken: token, externalId });
    if (!player) {
      return res.status(404).json({ error: { message: 'Player with given token not found' } });
    }

    let ok = false;
    await pg.transaction(async (tx) => {
      let { subscriptionOptionsId } = player;
      if (!subscriptionOptionsId) {
        const so = await repository.createOrUpdatePlayerSubscriptionOptions(tx, player, {
          emails: 'all',
          smses: 'all',
        });
        subscriptionOptionsId = so.id;
      }

      await repository.snoozePlayerSubscription(tx, subscriptionOptionsId, type, revertSnooze);
      ok = true;
    });

    const response: DataResponse<OkResult> = { data: { ok } };
    return res.json(response);
  } catch (e) {
    logger.error('snoozePlayerSubscription error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getPlayerAvailableContent,
  getPlayerSentContent,
  getPlayerSubscriptionOptions,
  updatePlayerSubscriptionOptions,
  snoozePlayerSubscription,
};
