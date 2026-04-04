/* @flow */
import type {
  ExchangeRewardResponse,
  ExchangeRewardParams,
  CreditRewardResponse,
  CreditRewardParams,
  GetAvailableRewardsResponse,
  GetAvailableRewardsParams,
} from 'gstech-core/modules/clients/rewardserver-api-types';

import type {
  RewardWithGame,
} from 'gstech-core/modules/types/rewards';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const { exchangeCoinsForReward } = require('../ShopItems');
const {
  getAvailableRewardsSchema,
  creditRewardSchema,
  creditRewardByExternalIdSchema,
  useRewardSchema,
} = require('./schemas');
const Ledgers = require('../ledgers/Ledgers');
const Rewards = require('./Rewards');

const getAvailableRewards = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const { rewardType, externalId, group, excludeDisabled } = validate<GetAvailableRewardsParams>(req.query, getAvailableRewardsSchema);
    const { brandId } = (req: any).params;

    const rewards = await Rewards.getRewards(pg, brandId, { rewardType, externalId, group, excludeDisabled });
    const response: DataResponse<GetAvailableRewardsResponse> = { data: rewards };

    return res.json(response);
  } catch (e) {
    logger.error('getAvailableRewards error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getRewardInfo = async (req: express$Request, res: express$Response): Promise<any> => {
  try {
    logger.debug('getRewardInfo request', { params: req.params });

    const { params: { rewardId } }: { params: { rewardId: Id } } = (req: any);
    const reward = await Rewards.getRewardWithGame(pg, rewardId);

    if (!reward) {
      return Promise.reject({ httpCode: 404, message: `Reward ${rewardId} not found` });
    }

    const response: DataResponse<RewardWithGame> = { data: reward };
    return res.json(response);
  } catch (e) {
    logger.error('getRewardInfo error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
}

const creditReward = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('creditReward request', { params: req.params, body: req.body });

    // TODO: always undefined, get userId from somewhere else?
    const userId = Number(req.header('x-userid')) || undefined;
    const { rewardId, playerId, comment, source, ...options } = validate<CreditRewardParams>(
      { ...req.params, ...req.body },
      creditRewardSchema,
    );

    const ledgers = await pg.transaction(async (tx) => {
      const reward = await Rewards.getReward(tx, rewardId, req.brandId);
      if (!reward) {
        return Promise.reject({ httpCode: 404, message: `Reward ${rewardId} not found` });
      }

      const ledgers2 = await Ledgers.creditReward(tx, reward, playerId, source, options);
      await Ledgers.createLedgersEvents(tx, ledgers2.map(({ id }) => id), {
          event: 'reward_credit',
          comment,
          userId,
        });
      return ledgers2;
    });
    const response: DataResponse<CreditRewardResponse> = {
      data: {
        ledgers: ledgers.map(({ id, rewardId: rewardId2 }) => ({ id, rewardId: rewardId2 })),
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('creditReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const creditRewardByExternalId = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    logger.debug('creditRewardByExternalId request', { body: req.body });

    const userId = Number(req.header('x-userid')) || undefined;
    const { externalId, rewardType, playerId, group, comment, source, ...options } = validate(
      req.body,
      creditRewardByExternalIdSchema,
    );
    const ledgers = await pg.transaction(async (tx) => {
      const reward = await Rewards.getRewardByExternalId(tx, {
        externalId,
        rewardType,
        group,
        brandId: req.brandId,
      });

      const ledgers2 = await Ledgers.creditReward(tx, reward, playerId, source, options);
      await Ledgers.createLedgersEvents(tx, ledgers2.map(({ id }) => id), {
        event: 'reward_credit',
        comment,
        userId,
      });
      return ledgers2;
    });
    const response: DataResponse<CreditRewardResponse> = {
      data: {
        ledgers: ledgers.map(({ id, rewardId: rewardId2 }) => ({ id, rewardId: rewardId2 })),
      },
    };
    return res.json(response);
  } catch (e) {
    logger.error('creditRewardByExternalId error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const exchangeReward = async (req: express$Request, res: express$Response): Promise<any> => {
  try {
    logger.debug('exchangeReward request', { params: req.params, body: req.body });

    const { rewardId, playerId } = validate<ExchangeRewardParams>({ ...req.params, ...req.body }, useRewardSchema);
    return await pg.transaction(async (tx) => {
      const ledgerId = await exchangeCoinsForReward(tx, playerId, rewardId, req.brandId);
      if (ledgerId) {
        const rewards = await Ledgers.useLedger(tx, playerId, ledgerId);
        const response: DataResponse<ExchangeRewardResponse> = { data: rewards };
        return res.json(response);
      }
      return Promise.reject({ httpCode: 403, message: `reward '${rewardId}' cannot be credited to player ${playerId}` });
    });
  } catch (e) {
    logger.error('exchangeReward error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  getAvailableRewards,
  getRewardInfo,
  creditReward,
  creditRewardByExternalId,
  exchangeReward,
};
