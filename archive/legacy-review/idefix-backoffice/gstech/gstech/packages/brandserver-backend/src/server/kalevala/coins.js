/* @flow */
import type { Journey, Player } from '../common/api';
import type { Coin, ShopItem, CoinBalance } from '../common/common-responders';
import type { ShopV1MeterStates } from './kalevala-progress';

const client = require('gstech-core/modules/clients/rewardserver-api');
const logger = require('../common/logger');
const configuration = require('../common/configuration');
const rewards = require('../common/modules/rewards');
const { mapShopItem } = require('./import-tools');

const addCoinToUser = async (player: Player, coin: Coin): Promise<void> => {
  await rewards.creditReward('coins', {
    id: coin.currency === 'gold' ? 'Gold' : 'Iron',
    externalId: coin.id,
    count: coin.value,
  }, player);
}

const creditShopItem = async (player: Player, externalId: string, id: string): Promise<void> => {
  await rewards.creditReward('shopItems', {
    id,
    externalId,
  }, player);
}

const buy = async (req: express$Request, id: string): Promise<ShopItem> => {
  const r = await rewards.exchange(req, Number(id));
  return mapShopItem(r[0]);
}

const use = async (req: express$Request, id: string): Promise<ShopItem> => {
  const r = await rewards.use(req, Number(id));
  return mapShopItem(r[0]);
}

const coinBalance = async (journey: Journey): Promise<CoinBalance> => {
  const { gold, iron } = await rewards.getBalances(journey.req);
  return {
    gold: Math.min(999, gold ? gold.total : 0),
    iron: Math.min(999, iron ? iron.total : 0),
  };
};

const getMeterStates = async (journey: Journey): Promise<ShopV1MeterStates> => {
  const progresses = await rewards.getProgresses(journey.req);
  const coinProgress = rewards.progressForRewardType(progresses, 'iron');

  const res = {
    coins: {
      completed: false,
      progress: coinProgress.progress * 0.99,
      coins: coinProgress.rewards.length > 0 && coinProgress.rewards[0].quantity || 0,
      type: coinProgress.rewards.length > 0 && coinProgress.rewards[0].reward.currency || 'iron',
    },
  };
  logger.debug('getMeterStates', { username: journey.req.user.username, res });
  return res;
};

const shopItems = async (journey: Journey): Promise<ShopItem[]> => {
  const { ledgers } = await client.getUnusedLedgers(configuration.shortBrandId(), journey.req.context.playerId, { group: 'shopItems' });
  const available = await client.getAvailableRewards(configuration.shortBrandId(),{ group: 'shopItems' });
  const filteredAvailable = available.map(mapShopItem).filter((shopItem) => journey.checkTags(shopItem.tags));
  return [...ledgers.map(x => ({ ...mapShopItem(x), price: 0, id: `use/${x.id}` })), ...filteredAvailable];
}

const getShopItem = async (id: string): Promise<ShopItem> => {
  const r = await rewards.getByExternalId(id);
  return mapShopItem(r);
}

module.exports = {
  addCoinToUser,
  buy,
  use,
  coinBalance,
  getMeterStates,
  shopItems,
  getShopItem,
  creditShopItem,
};
