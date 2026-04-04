/* @flow */

import type { Reward, RewardDefinition, RewardWithGame } from 'gstech-core/modules/types/rewards';

const _ = require('lodash');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');
const walletApi = require('gstech-core/modules/clients/walletserver-api');

const { rewardDefinitions, thumbnails } = require('../reward-definitions/definitions');
const { groupDefinitions } = require('../reward-definitions/groupDefinitions');
const Rewards = require('../rewards/Rewards');
const Games = require('../games/Games');
const { createRewardSchema, getRewardsSchema, updateRewardSchema } = require('./schemas');

const createReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('createReward request', { body: req.body });

    let createRewardDraft = validate(req.body, createRewardSchema);

    if (createRewardDraft.creditType === 'freeSpins') {
      const gameInfo = await Games.getGameById(pg, createRewardDraft.gameId);
      if (gameInfo?.parameters?.tableId) {
        const { campaignId } = await walletApi.createFreeSpins('EVO', {
          bonusCode: createRewardDraft.bonusCode,
          tableId: gameInfo.parameters.tableId,
        });
        createRewardDraft = {
          ...createRewardDraft,
          metadata: { ...createRewardDraft.metadata, campaignId },
        };
      }
    }

    const reward = await Rewards.createReward(pg, createRewardDraft);

    const response: DataResponse<Reward> = { data: reward };
    return res.status(201).json(response);
  } catch (e) {
    logger.error('createReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('deleteReward request', { params: req.params });

    const { rewardId }: { rewardId: Id } = (req.params: any);

    const reward = await Rewards.getReward(pg, rewardId);
    if (!reward) {
      return res.status(404).json({ error: { message: `Could not find reward ${rewardId}` } });
    }

    if (reward.removedAt !== null) {
      return res.status(409).json({ error: { message: `Reward has already been removed` } });
    }

    await Rewards.deleteReward(pg, rewardId);

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.json(response);
  } catch (e) {
    logger.error('deleteReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const duplicateReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('duplicateReward request', { params: req.params });

    const { rewardId }: { rewardId: Id } = (req.params: any);

    const reward = await Rewards.duplicateReward(pg, rewardId);

    const response: DataResponse<Reward> = { data: reward };
    return res.json(response);
  } catch (e) {
    logger.error('duplicateReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('getReward request', { params: req.params });

    const { rewardId }: { rewardId: Id } = (req.params: any);

    const reward = await Rewards.getRewardWithGame(pg, rewardId);

    const response: DataResponse<RewardWithGame> = { data: reward };
    return res.json(response);
  } catch (e) {
    logger.error('getReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getRewards = (
  excludeDisabled: boolean,
): ((req: express$Request, res: express$Response) => Promise<express$Response>) => async (
  req,
  res,
) => {
  try {
    logger.debug('getRewards request', { query: req.query });

    const { type, brandId, group, removed } = validate(req.query, getRewardsSchema);

    const rewards = await Rewards.getRewards(
      pg,
      brandId,
      { rewardType: type, group, getRemoved: removed, excludeDisabled },
    );

    return res.json({ data: rewards });
  } catch (e) {
    logger.error('getRewards error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const init = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('init request');

    const rds: RewardDefinition[] = await pg('reward_definitions');
    const definitions = _.mapValues(rewardDefinitions, (d, brandId) =>
      d.map(({ internal, initialize, ...r }) => {
        const rd = rds.find((dbrd) => dbrd.brandId === brandId && dbrd.rewardType === r.type);
        return { ...r, id: rd && rd.id };
      }),
    );
    return res.json({ data: { rewardDefinitions: definitions, thumbnails } });
  } catch (e) {
    logger.error('init error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const initGroups = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('initGroups request');

    return res.json({ data: groupDefinitions });
  } catch (e) {
    logger.error('initGroups error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('updateReward request', { body: req.body, params: req.params });

    const { rewardId }: { rewardId: Id } = (req.params: any);
    validate(req.body, updateRewardSchema);

    const reward = await Rewards.getReward(pg, rewardId);
    if (!reward || reward.removedAt !== null) {
      return res
        .status(404)
        .json({ error: { message: `Reward ${rewardId} not found or removed` } });
    }

    const returnReward = await Rewards.updateReward(pg, rewardId, req.body);
    const response: DataResponse<Reward> = { data: returnReward };
    return res.json(response);
  } catch (e) {
    logger.error('updateReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  createReward,
  deleteReward,
  duplicateReward,
  getReward,
  getRewards,
  init,
  initGroups,
  updateReward,
};
