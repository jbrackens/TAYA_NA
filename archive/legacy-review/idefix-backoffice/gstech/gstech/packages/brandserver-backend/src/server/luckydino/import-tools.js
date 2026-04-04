/* @flow */
import type { RewardWithGame } from 'gstech-core/modules/types/rewards';
import type { RewardDefinition } from './rewards';

const { mapLegacyCreditType } = require('../common/import-tools');

const mapReward = (r: RewardWithGame): RewardDefinition => {
  const { game, reward } = r;
  return {
    id: reward.externalId,
    type: reward.spinType || 'normal',
    bonusCode: reward.bonusCode,
    spins: reward.spins || 0,
    game: game ? game.permalink : '',
    cost: reward.cost,
    credit: mapLegacyCreditType(reward.creditType),
    mobile: true,
    action: reward.metadata.action || `/loggedin/game/${game ? game.permalink : ''}/`,
    description: reward.description,
    thumbnail: reward.metadata.thumbnail || (game && game.thumbnail) || undefined,
    tags: reward.metadata.tags != null && reward.metadata.tags !== '' ? reward.metadata.tags.split(',') : [],
  };
};

module.exports = { mapReward };
