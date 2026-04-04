 
/* @flow */
import type { Reward } from 'gstech-core/modules/types/rewards';
import type { FavouriteGames } from '../../../types/repository';

const sample = require('lodash/sample');

const { getLootBoxRewardCandidates } = require('../rewards/Rewards');

const KKLootBoxWeights = {
  '10': [
    { cost: 50, weight: 0.509 },
    { cost: 100, weight: 0.25 },
    { cost: 200, weight: 0.2 },
    { cost: 500, weight: 0.03 },
    { cost: 1000, weight: 0.005 },
    { cost: 2500, weight: 0.006 },
  ],
  '25': [
    { cost: 50, weight: 0.08 },
    { cost: 100, weight: 0.08 },
    { cost: 250, weight: 0.33 },
    { cost: 300, weight: 0.290 },
    { cost: 400, weight: 0.14 },
    { cost: 500, weight: 0.06 },
    { cost: 1000, weight: 0.01 },
    { cost: 2500, weight: 0.005 },
    { cost: 5000, weight: 0.005 },
  ],
  '100': [
    { cost: 100, weight: 0.08 },
    { cost: 400, weight: 0.13 },
    { cost: 1000, weight: 0.36 },
    { cost: 1500, weight: 0.35 },
    { cost: 2000, weight: 0.06 },
    { cost: 4000, weight: 0.01 },
    { cost: 10000, weight: 0.005 },
    { cost: 20000, weight: 0.005 },
  ],
  '1000': [
    { cost: 1000, weight: 0.08 },
    { cost: 5000, weight: 0.1 },
    { cost: 10000, weight: 0.39 },
    { cost: 15000, weight: 0.35 },
    { cost: 20000, weight: 0.06 },
    { cost: 50000, weight: 0.01 },
    { cost: 100000, weight: 0.01 },
  ],
  '5000': [
    { cost: 5000, weight: 0.11 },
    { cost: 25000, weight: 0.28 },
    { cost: 50000, weight: 0.33 },
    { cost: 100000, weight: 0.23 },
    { cost: 200000, weight: 0.04 },
    { cost: 500000, weight: 0.01 },
  ],
};

const getBoxRewards = async (
  knex: Knex,
  favouriteGames: FavouriteGames,
  cost: number,
  brandId: BrandId,
  playerId: Id,
  rewards?: Reward[] = [],
): Promise<Reward[]> => {
  let isMoney = false;
  if (cost >= 1000 && cost <= 2000) {
    isMoney = Math.random() > 0.5;
  } else if (cost > 2000) {
    isMoney = true;
  }

  let reward: ?{ ...Reward, cost: number } = null;
  if (isMoney) {
    [reward] = await getLootBoxRewardCandidates(knex, cost, brandId, true);

    if (!reward) {
      throw new Error(`No definition for real cash reward of value: ${cost}, brandId: ${brandId}`);
    }
  } else {
    const rewardCandidates = (await getLootBoxRewardCandidates(knex, cost, brandId): any);

    // Try to select the best reward for the player
    for (const favouriteGame of favouriteGames) {
      if (rewards.find(r => (r.gameId === favouriteGame.gameId))) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Find rewards for favourite game
      const favouriteGameRewards = rewardCandidates.filter(candidate => candidate.gameId === favouriteGame.gameId);

      // Pick the reward with slightly bigger reward than players avarage bet
      if (favouriteGameRewards.length > 0) {
        const sortedRewards = favouriteGameRewards.sort((a, b) => b.spinValue - a.spinValue);

        const higherBetsRewards = sortedRewards.filter(r => r.spinValue > favouriteGame.avgBet);

        if (higherBetsRewards.length) {
          // Pick first higher spinValue reward
          reward = higherBetsRewards[higherBetsRewards.length - 1];
          break;
        } else {
          // Pick highest spinValue reward
          [reward] = sortedRewards;
          break;
        }
      }
    }

    // Pick a random reward for the player
    if (!reward) {
      reward = sample(rewardCandidates);
    }
  }

  const typelessReward: any = reward;
  rewards.push(typelessReward);

  if (cost - reward.cost >= 50) {
    // Recursively add more rewards
    return getBoxRewards(knex, favouriteGames, cost - reward.cost, brandId, playerId, rewards);
  }

  return rewards;
};

module.exports = {
  getBoxRewards,
  KKLootBoxWeights,
};
