/* @flow */
import type { CasinoCurrency } from 'gstech-core/modules/types/rewards';
import type { Journey } from '../common/api';
import type { ShopItem, CoinBalance } from '../common/common-responders';

const _ = require('lodash');
const { pluckAll } = require('../common/utils');
const coins = require('./coins');

export type ShopV1MeterStates = {
  coins: ?{
    completed: boolean,
    progress: number,
    coins: number,
    type: CasinoCurrency,
  },
};

const shopItems = async (journey: Journey): Promise<Array<ShopItem>> => {
  const balance = await coins.coinBalance(journey);
  const shop = await coins.shopItems(journey);
  const filtered =
    // $FlowFixMe[missing-type-arg]
    shop.map<ShopItem>(x => {
      const locked = isLocked(x, balance);
      return _.extend({ locked }, pluckAll(x, 'id', 'game', 'action', 'spins', 'type', 'price', 'currency', 'spintype', 'value'));
    })
  return _(filtered).sortBy((s) => s.locked ? -s.cost : s.cost); // Most valuable player can afford first, locked ones starting from cheapest
};

const isLocked = (x: ShopItem, balance: CoinBalance) => {
  if (x.currency === 'gold') {
    return x.price > balance.gold;
  } if (x.currency === 'iron') {
    return x.price > balance.iron;
  }
  return true;
};

module.exports = {
  getMeterStates: coins.getMeterStates,
  coinBalance: coins.coinBalance,
  shopItems,
  getShopItem: coins.getShopItem,
};
