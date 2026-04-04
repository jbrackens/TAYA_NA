// @flow
import type { PlayerNotificationsWithEvents, CampaignContentCreate } from '../../../../types/common';

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');

const repository = require('./repository');
const schemas = require('./schemas');

const addCampaignContent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('addCampaignContent request', { body: req.body, campaign: req.campaign });

    const campaignId = req.campaign.id;
    const campaignContent = validate<CampaignContentCreate>(
      req.body,
      schemas.addCampaignContent,
      'Schema validation failed',
    );

    try {
      const campaignContentId = await repository.createCampaignContent(
        pg,
        campaignId,
        campaignContent,
      );

      const response: DataResponse<{ campaignContentId: Id }> = { data: { campaignContentId } };
      return res.json(response);
    } catch (e) {
      logger.error('createCampaignContent error', e);
      return res.status(409).json({
        error: {
          message: `Failed to connect content ${campaignContent.contentId} to campaign ${campaignId}`,
        },
      });
    }
  } catch (e) {
    logger.error('addCampaignContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteCampaignContent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteCampaignContent request', { params: req.params });

    const campaignContentId: Id = Number(req.params.campaignContentId);

    try {
      await repository.deleteCampaignContent(pg, campaignContentId);
    } catch (e) {
      return res.status(409).json({
        error: { message: `Failed to delete ${campaignContentId}` },
      });
    }

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('deleteCampaignContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerNotifications = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { externalPlayerId }: { externalPlayerId: Id } = (req.params: any);
    const notifications = await repository.getPlayerNotificationsWithEvents(
      pg,
      externalPlayerId,
    );

    const response: DataResponse<PlayerNotificationsWithEvents> = { data: notifications };
    return res.json(response);
  } catch (e) {
    logger.error('getPlayerNotifications error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateCampaignContent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateCampaignContent request', { params: req.params });

    const campaignContentId: Id = Number(req.params.campaignContentId);
    const campaignContent = validate<CampaignContentCreate>(
      req.body,
      schemas.addCampaignContent,
      'Schema validation failed',
    );

    try {
      await repository.updateCampaignContent(pg, campaignContentId, campaignContent);

      const response: DataResponse<OkResult> = { data: { ok: true } };
      return res.json(response);
    } catch (e) {
      logger.error('updateCampaignContent error', e);
      return res.status(409).json({
        error: {
          message: `Failed to update ${campaignContentId} with content ${campaignContent.contentId}`,
        },
      });
    }
  } catch (e) {
    logger.error('updateCampaignContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  addCampaignContent,
  deleteCampaignContent,
  getPlayerNotifications,
  updateCampaignContent,
};
