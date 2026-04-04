/* @flow */
import type { Journey } from '../common/api';

const logger = require('../common/logger');
const rewards = require('../common/modules/rewards');

const levelWager = [0, 0, 3000, 10000, 50000, 100000, 200000, 500000, 1000000, 100000000];

export type JefeMeterStates = {
  level: {
    completed: boolean,
    progress: number,
  },
  wheel: {
    completed: boolean,
    progress: number,
    count: number,
  },
  bounty: {
    completed: boolean,
    progress: number,
    count: number,
  },
};

const findCurrentLevelMeter = (wagered: number, level: number) => {
  const currentLevelWagerBase = levelWager[level - 1];
  if (currentLevelWagerBase > 0) {
    const previousLevelWagerBase = levelWager[level - 2];
    const currentLevelWagerRequirement = currentLevelWagerBase - previousLevelWagerBase;
    const currentLevelWagered = wagered - previousLevelWagerBase;
    return Math.min(100, Math.max(0, 100 * (currentLevelWagered / currentLevelWagerRequirement)));
  }
  return 0;
};

const getMeterStates = async (journey: Journey): Promise<?JefeMeterStates> => {
  const { balance } = journey;
  if (balance != null) {
    const progresses = await rewards.getProgresses(journey.req);
    const { progress: wheelProgress } = rewards.progressForRewardType(progresses, 'wheelSpin')
    const { progress: bountyProgress } = rewards.progressForRewardType(progresses, 'bountyCycle')
    const wheelCount = rewards.groupCount(progresses, 'wheelSpin');
    const bountyCount = rewards.groupCount(progresses, 'bounty');

    const points = parseFloat(balance.CurrentLoyaltyPoints) || 0;

    const res = {
      level: { completed: false, progress: findCurrentLevelMeter(points, journey.balance?.VIPLevel || 1) * 0.99 },
      wheel: { completed: false, progress: wheelProgress * 0.99, count: wheelCount },
      bounty: { completed: false, progress: bountyProgress * 0.99, count: bountyCount },
    };
    logger.debug('getMeterStates', {
      username: journey.req.user.username,
      points,
      lvl: journey.balance?.VIPLevel,
      res,
    });
    return res;
  }
};

module.exports = {
  getMeterStates,
};
