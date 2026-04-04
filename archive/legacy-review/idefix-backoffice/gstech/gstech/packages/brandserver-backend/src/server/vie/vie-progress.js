/* @flow */
import type { Journey } from '../common/api';

const logger = require('../common/logger');
const localization = require('../common/localization');
const rewards = require('../common/modules/rewards');

export type VieMeterStates = {
  reward: {
    completed: boolean,
    progress: number,
    count: number,
    data: {
      type: ?string,
      game: string,
    },
  },
};

const getMeterStates = async (journey: Journey): Promise<?VieMeterStates> => {
  const progresses = await rewards.getProgresses(journey.req);
  const { rewards: rs, progress } = rewards.progressForRewardType(progresses, 'rewardCycle');
  const count = rewards.groupCount(progresses, 'reward');

  if (rs.length === 1) {
    const [{ game, reward }] = rs;
    const res = {
      reward: {
        completed: false,
        progress: progress * 0.99,
        count,
        data: {
          type: localization.localize(journey.req.context.languageISO)(`dinorewards.${reward.spinType || 'normal'}spins`, { count: reward.spins }),
          game: (game != null ? game.name : undefined) || '-',
        },
      },
    };
    logger.debug('getMeterStates', { username: journey.req.user.username, res });
    return res;
  }
  return null;
};


module.exports = {
  getMeterStates,
};
