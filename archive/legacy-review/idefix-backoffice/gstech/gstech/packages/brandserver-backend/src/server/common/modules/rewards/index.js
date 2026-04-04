/* @flow */
import type { UseLedgerResponse, CreditRewardResponse, ExchangeRewardResponse, PlayerProgress } from 'gstech-core/modules/clients/rewardserver-api-types';
import type { LedgerWithRewardAndGame, RewardWithGame, PlayerBalance, RewardType, RewardGroup } from 'gstech-core/modules/types/rewards';
import type { Player } from '../../api';

const _ = require('lodash');
const client = require('gstech-core/modules/clients/rewardserver-api');
const configuration = require('../../configuration');
const logger = require('../../logger');

export type RewardCreate = {
  id: string,
  externalId: string,
  count?: number,
};

const getByExternalId = async (externalId: string): Promise<RewardWithGame> => {
  const data = await client.getAvailableRewards(configuration.shortBrandId(), { externalId });
  if (data.length !== 1) {
    logger.error('Unable to find reward by externalId', externalId, data);
  }
  return data[0];
};

const creditReward = async (group: RewardGroup, reward: RewardCreate, user: Player): Promise<?CreditRewardResponse> => {
  try {
    return await client.creditRewardByExternalId(configuration.shortBrandId(), {
      externalLedgerId: reward.externalId,
      playerId: Number(user.details.ClientID),
      group,
      externalId: reward.id,
      count: reward.count,
    });
  } catch (e) {
    logger.error('Unable to credit reward to player', reward.id, user.username, e);
    return null;
  }
};

const getRewards = async (req: express$Request, group?: RewardGroup): Promise<LedgerWithRewardAndGame[]> => {
  const { ledgers } = await client.getUnusedLedgers(configuration.shortBrandId(), req.context.playerId, { group });
  return ledgers;
}

const getProgresses = async (req: express$Request): Promise<PlayerProgress[]> => {
  const { progresses } = await client.getPlayerProgresses(configuration.shortBrandId(), req.context.playerId);
  return progresses;
}

const groupCount = (progresses: PlayerProgress[], groupId: RewardGroup): number =>
  progresses.filter(g => g.groupId === groupId).map(x => x.ledgers).reduce((a, b) => a+b, 0);

const progressForRewardType = (progresses: PlayerProgress[], rewardType: RewardType): PlayerProgress => {
  const p = _.find(progresses, x => x.rewardType === rewardType);
  if (p != null) {
    return p;
  }
  return {
    ledgers: 0,
    progress: 0,
    betCount: 0,
    rewardDefinitionId: 0,
    groupId: '',
    contribution: 0,
    multiplier: 0,
    rewards: [],
    target: 0,
    updatedAt: new Date(0),
    startedAt: new Date(0),
    rewardType,
  };
};

const getBalances = async (req: express$Request): Promise<PlayerBalance> =>
  client.getBalances(configuration.shortBrandId(), req.context.playerId);

const use = async (req: express$Request, id: Id): Promise<UseLedgerResponse> =>
  client.useLedger(configuration.shortBrandId(), id, req.context.playerId);

const useWheelSpin = async (req: express$Request): Promise<ExchangeRewardResponse> =>
  client.useWheelSpin(configuration.shortBrandId(), req.context.playerId);

const exchange = async (req: express$Request, id: Id): Promise<ExchangeRewardResponse> =>
  client.exchangeReward(configuration.shortBrandId(), id, req.context.playerId);


module.exports = {
  creditReward,
  getProgresses,
  groupCount,
  progressForRewardType,
  getBalances,
  getRewards,
  getByExternalId,
  use,
  useWheelSpin,
  exchange,
};