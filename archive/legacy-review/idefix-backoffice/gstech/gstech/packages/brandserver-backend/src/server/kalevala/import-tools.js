/* @flow */
import type { RewardWithGame, LedgerWithRewardAndGame } from 'gstech-core/modules/types/rewards';
import type { ShopItem } from '../common/common-responders';

const { mapLegacyCreditType } = require('../common/import-tools');

 
const mapShopItem = (r: LedgerWithRewardAndGame | RewardWithGame): ShopItem => {
  const { game, reward } = r;
  return {
    id: String(reward.id),
    type: mapLegacyCreditType(reward.creditType),
    spintype: reward.spinType || undefined,
    bonusCode: reward.bonusCode,
    description: reward.description,
    spins: reward.spins || 0,
    game: game ? game.permalink : undefined,
    action: reward.metadata.action ? reward.metadata.action : (game ? `/loggedin/game/${game.permalink}/` : '/loggedin/myaccount/shop'),
    currency: reward.currency,
    price: reward.price || 0,
    value: reward.creditType === 'real' ? reward.cost / 100 : undefined,
    cost: reward.cost,
    tags: reward.metadata.tags != null && reward.metadata.tags !== '' ? reward.metadata.tags.split(',') : [],
    trigger: reward.metadata.trigger,
    creditOnce: reward.price === 0,
  };
};
module.exports = { mapShopItem };
