/* eslint-disable no-unused-vars */
/* @flow */
import type { CMoney } from 'gstech-core/modules/money-class';
import type { CasinoCurrency } from 'gstech-core/modules/types/rewards';
import type { Player, DepositDetails, Journey } from './api';
import type { LegacyCreditType } from "./import-tools";

export type Coin = { id: string, value: number, currency: CasinoCurrency };

export type ShopItem = {
  price: number,
  currency: ?CasinoCurrency,
  bonusCode: string,
  game?: string,
  spintype: ?string,
  spins: number,
  trigger: ?string,
  description?: string,
  type: LegacyCreditType,
  id: string,
  creditOnce: boolean,
  action: ?string,
  tags: string[],
  value: ?number,
  cost: number,
};

export type CoinBalance = {
  [type: CasinoCurrency]: number,
};

const legacyCoins = {
  registration:  {
    "id": "a1",
    "value": 10,
    "currency": "iron",
  },
  "deposit-1": {
    "id": "a2",
    "value": 30,
    "currency": "iron",
  },
  "deposit-2": {
    "id": "a3",
    "value": 30,
    "currency": "iron",
  },
  "deposit-3": {
    "id": "a4",
    "value": 30,
    "currency": "iron",
  }
};

export type BrandProgress = {
  coinBalance(journey: Journey): Promise<CoinBalance>,
};

export type BrandCoins = {
  addCoinToUser(player: Player, coin: Coin): Promise<void>,
  creditShopItem(player: Player, externalId: string, id: string): Promise<void>,
};

module.exports = (
  progress: { ...BrandProgress, ... },
  coins: { ...BrandCoins, ... },
): ({
  deposit: (
    user: Player,
    req: express$Request,
    value: CMoney,
    tags: Array<string>,
    depositDetails: DepositDetails,
  ) => Promise<void>,
  register: (user: Player, req: express$Request) => Promise<void>,
}) => {
  const trigger = async (id: string, player: Player) => {
    // $FlowFixMe[invalid-computed-prop]
    const coin = legacyCoins[id];
    // dont' need to credit coins automatically anymore
    // if (coin) {
    //   // This should be replaced with campaign
    //   await coins.addCoinToUser(player, coin);
    // }
  };

   
  const register = async (user: Player, req: express$Request) => {
    await trigger('registration', user);
  };

   
  const deposit = async (
    user: Player,
    req: express$Request,
    value: CMoney,
    tags: string[],
    depositDetails: DepositDetails,
  ) => {
    await trigger(`deposit-${user.numDeposits}`, user);
  };

  return { register, deposit };
};
