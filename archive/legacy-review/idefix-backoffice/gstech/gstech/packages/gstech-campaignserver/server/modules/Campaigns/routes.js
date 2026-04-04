// @flow
import type {
  GetPlayerCampaignsResponse,
  GetPlayerCampaignsWithRewardsResponse,
  AddContentEventDraft,
  CampaignReward
} from 'gstech-core/modules/clients/campaignserver-api-types';

import type { GetCampaignsWithRewards } from '../../../types/api';
import type { Campaign, CampaignStats, CompleteCampaign } from '../../../types/common';
import type { CampaignsList } from '../../../types/repository';

const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const pg = require('gstech-core/modules/pg');
const { getRewardInfo } = require('gstech-core/modules/clients/rewardserver-api');

const schemas = require('./schemas');
const repository = require('./repository');
const { createEvent } = require('../Events/repository');
const { sendSmsesToCampaignAudience } = require('../Smses/smsSender');
const { sendEmailsToCampaignAudience } = require('../Emails/emailSender');

const activateCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('activateCampaign request', { campaign: req.campaign });

    const { campaign } = req;

    if (campaign.status !== 'draft') {
      return res.status(403).json({
        error: { message: 'Only campaigns of type "draft" can be activated' },
      });
    }

    if (!campaign.startTime || campaign.startTime < new Date()) {
      await repository.startCampaign(pg, campaign.id);
    } else {
      await repository.updateCampaign(pg, campaign.id, { status: 'active' });
    }

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('activateCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const addContentEvent = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('addContentEvent request', { body: req.body });
    const externalPlayerId = Number(req.params.externalPlayerId);
    const campaignId = Number(req.params.campaignId);

    const eventDraft = validate<AddContentEventDraft>(
      req.body,
      schemas.addContentEventSchema,
      'Schema validation failed',
    );

    const eventId = await createEvent(pg, { ...eventDraft, campaignId, externalPlayerId });

    const response: DataResponse<{ eventId: Id }> = { data: { eventId } };
    return res.json(response);
  } catch (e) {
    logger.error('addContentEvent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const addRewardRule = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('addRewardRule request', { body: req.body, campaign: req.campaign });

    const rewardRuleDraft = validate(
      req.body,
      schemas.addRewardRuleSchema,
      'Schema validation failed',
    );

    // TODO: Check if such reward exists

    const [rewardRuleId] = await repository.createRewardRules(
      pg,
      [rewardRuleDraft],
      req.campaign.id,
    );

    const response: DataResponse<{ rewardRuleId: Id }> = { data: { rewardRuleId } };
    return res.json(response);
  } catch (e) {
    logger.error('addRewardRule error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const archiveCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('archiveCampaign request', { campaign: req.campaign });

    await repository.archiveCampaign(pg, req.campaign);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('archiveCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const createCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createCampaign request', { body: req.body });

    const campaignDraft = validate(
      req.body,
      schemas.createCampaignSchema,
      'Schema validation failed',
    );

    const campaignId = await repository.createCampaign(pg, {
      ...campaignDraft,
      status: 'draft',
    });

    return res.json({ data: { campaignId } });
  } catch (e) {
    logger.error('createCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteRewardRule = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteRewardRule request', { params: req.params, campaign: req.campaign });

    const rewardRuleId: Id = Number(req.params.rewardRuleId);

    try {
      await repository.deleteRewardRule(pg, rewardRuleId);
    } catch (e) {
      return res.status(409).json({
        error: { message: `Failed to delete reward rule ${rewardRuleId}` },
      });
    }

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('deleteRewardRule error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const duplicateCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('duplicateCampaign request', { campaign: req.campaign });

    const campaignId = await repository.duplicateCampaign(pg, req.campaign.id);

    const response: DataResponse<{ campaignId: Id }> = { data: { campaignId } };
    return res.json(response);
  } catch (e) {
    logger.error('duplicateCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getCampaign request', { params: req.params, campaign: req.campaign });

    const campaign = await repository.getCompleteCampaign(pg, req.campaign.id);

    const response: DataResponse<CompleteCampaign> = { data: { ...campaign } };
    return res.json(response);
  } catch (e) {
    logger.error('getCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getCampaigns = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getCampaigns request', { query: req.query });

    const { campaignStatus, brandId, ...pagination } = validate(req.query, schemas.getCampaignsSchema);

    const campaigns = await repository.getCampaigns(
      pg,
      campaignStatus === 'active' ? [campaignStatus, 'running'] : [campaignStatus],
      brandId,
      pagination
    );

    const response: DataResponse<CampaignsList> = { data: campaigns };
    return res.json(response);
  } catch (e) {
    logger.error('getCampaigns error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getCampaignStats = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('>>> getCampaignStats', { params: req.params });

    const stats = await repository.getCampaignStats(pg, req.campaign.id);

    const response: DataResponse<CampaignStats> = { data: stats };
    logger.debug('<<< getCampaignStats', { response });
    return res.json(response);
  } catch (e) {
    logger.error('XXX getCampaignStats', { e });
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getCampaignsWithRewards = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getCampaignsWithRewards request');

    const campaigns = await repository.getCampaignsWithRewards(pg);

    const response: DataResponse<GetCampaignsWithRewards> = { data: campaigns };
    return res.json(response);
  } catch (e) {
    logger.error('getCampaignsWithRewards error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getCsvAudience = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getCsvAudience request', { query: req.query, campaign: req.campaign });

    const { type } = validate(
      req.query,
      schemas.getCsvAudienceQuerySchema,
      'invalid query parameter',
    );

    const csvContent = await pg.transaction((tx) =>
      repository.getCsvAudience(tx, req.campaign.id, type),
    );

    const filename = encodeURIComponent(`${req.campaign.name}_audience_${new Date().getTime()}.csv`);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (e) {
    logger.error('getCsvAudience error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerCampaigns = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { externalPlayerId }: { externalPlayerId: Id } = (req.params: any);

    const campaigns = await repository.getPlayerCampaigns(pg, externalPlayerId);

    const response: DataResponse<GetPlayerCampaignsResponse> = { data: campaigns };
    return res.status(200).json(response);
  } catch (e) {
    logger.error('getPlayerCampaigns error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getPlayerCampaignsWithRewards = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {

    const { externalPlayerId }: { externalPlayerId: Id } = (req.params: any);

    const campaigns = await repository.getPlayerCampaignsWithRewards(
      pg,
      externalPlayerId,
    );

    // Query rewardserver for creditType of each reward
    const campaignsWithCreditType = await Promise.all(
      campaigns.map(async (c) => ({
        ...c,
        rewards: await Promise.all(
          c.rewards.map(async (r): Promise<CampaignReward> => {
            const data = await getRewardInfo(r.id);
            if (!data) {
              return Promise.reject({
                httpCode: 404,
                message: `Could not fetch reward ${r.id} from rewardserver`,
              });
            }

            return { ...r, ..._.omit(data, 'rewardDefinitionId') };
          }),
        ),
      })),
    );

    const response: DataResponse<GetPlayerCampaignsWithRewardsResponse> = {
      data: campaignsWithCreditType,
    };
    return res.status(200).json(response);
  } catch (e) {
    logger.error('getPlayerCampaignsWithRewards error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const sendCampaignEmails = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('sendCampaignEmails request', { campaign: req.campaign });

    if (req.campaign.status !== 'running') {
      return res
        .status(409)
        .json({ error: { message: 'Cannot send emails to campaign that is not running' } });
    }

    await pg.transaction(tx => sendEmailsToCampaignAudience(tx, req.campaign.id));

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.status(202).json(response);
  } catch (e) {
    logger.error('sendCampaignEmails error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const sendCampaignSmses = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('sendCampaignSmses request', { campaign: req.campaign });

    if (req.campaign.status !== 'running') {
      return res
        .status(409)
        .json({ error: { message: 'Cannot send smses to campaign that is not running' } });
    }

    await pg.transaction(tx => sendSmsesToCampaignAudience(tx, req.campaign.id));

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.status(202).json(response);
  } catch (e) {
    logger.error('sendCampaignSmses error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const stopCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('stopCampaign request', { campaign: req.campaign });

    if (!['running', 'active'].includes(req.campaign.status)) {
      return res
        .status(409)
        .json({ error: { message: `Cannot stop campaign with ${req.campaign.status} status` } });
    }

    await repository.stopCampaign(pg, req.campaign.id);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.status(200).json(response);
  } catch (e) {
    logger.error('stopCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const togglePreviewMode = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('togglePreviewMode request', { campaign: req.campaign });

    const updatedCampaign = await repository.togglePreviewMode(pg, req.campaign);

    const response: DataResponse<{ previewMode: boolean }> = {
      data: { previewMode: !!updatedCampaign.previewMode },
    };
    return res.json(response);
  } catch (e) {
    logger.error('togglePreviewMode error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateCampaign = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateCampaign request', { campaign: req.campaign, body: req.body });

    const campaignDraft = validate(
      req.body,
      schemas.updateCampaignSchema,
      'Schema validation failed',
    );

    if (Object.keys(campaignDraft || {}).length < 1) {
      return res.status(400).json({ error: { message: 'Cannot update campaign: empty request body' }});
    }

    const { status } = await repository.getCampaignWithAudienceRules(pg, req.campaign.id);
    if (status !== 'draft') {
      return res.status(403).json({ error: { message: 'Campaign has to be in "draft" status' } });
    }

    const campaign = await repository.updateCampaign(pg, req.campaign.id, campaignDraft);

    const response: DataResponse<Campaign> = { data: campaign };
    return res.json(response);
  } catch (e) {
    logger.error('updateCampaign error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateRewardRule = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateRewardRule request', {
      campaign: req.campaign,
      body: req.body,
      params: req.params,
    });

    const rewardRuleDraft = validate(
      req.body,
      schemas.addRewardRuleSchema,
      'Schema validation failed',
    );
    const {
      params: { rewardRuleId },
    }: { params: { rewardRuleId: Id } } = (req: any);

    const rewardRule = await repository.getRewardRule(pg, rewardRuleId);
    if (!rewardRule) {
      return res.status(404).json({ error: { message: `Reward rule ${rewardRuleId} not found` } });
    }

    await repository.updateRewardRule(pg, rewardRuleId, {
      ...rewardRuleDraft,
      campaignId: req.campaign.id,
    });

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('updateRewardRule error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  activateCampaign,
  addContentEvent,
  addRewardRule,
  archiveCampaign,
  createCampaign,
  deleteRewardRule,
  duplicateCampaign,
  getCampaign,
  getCampaigns,
  getCampaignStats,
  getCampaignsWithRewards,
  getCsvAudience,
  getPlayerCampaigns,
  getPlayerCampaignsWithRewards,
  sendCampaignEmails,
  sendCampaignSmses,
  stopCampaign,
  togglePreviewMode,
  updateCampaign,
  updateRewardRule,
};
