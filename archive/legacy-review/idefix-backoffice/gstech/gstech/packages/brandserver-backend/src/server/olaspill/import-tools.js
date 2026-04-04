/* @flow */
import type { RewardWithGame } from 'gstech-core/modules/types/rewards';
import type { ShopItem } from '../common/common-responders';

const _ = require('lodash');
const { mapLegacyCreditType } = require('../common/import-tools');

// eslint-disable-next-line no-unused-vars
const mapShopItem = (defaults: Partial<ShopItem>, errors: string[]): ((r: RewardWithGame) => ShopItem) => (r: RewardWithGame): ShopItem => {
  const { game, reward } = r;
  return _.extend<any, Partial<ShopItem>>(
    {
      id: reward.externalId,
      type: mapLegacyCreditType(reward.creditType),
      spintype: reward.spinType || undefined,
      bonusCode: reward.bonusCode,
      description: reward.description,
      spins: reward.spins || undefined,
      game: game ? game.permalink : undefined,
      action: reward.metadata.action ? reward.metadata.action : (game ? `/loggedin/game/${game.permalink}/` : undefined),
      currency: reward.currency,
      price: reward.price,
      value: reward.creditType === 'real' ? reward.cost / 100 : undefined,
      cost: reward.cost,
      tags: reward.metadata.tags != null && reward.metadata.tags !== '' ? reward.metadata.tags.split(',') : [],
      trigger: reward.metadata.trigger,
      creditOnce: reward.price === 0,
    },
    defaults,
  );
};
module.exports = { mapShopItem };
