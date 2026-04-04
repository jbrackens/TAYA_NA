/* @flow */

import type { Money } from 'gstech-core/modules/money-class';

export type UIBalance = {
  CurrentBonusBalance: string,
  CurrentRealBalance: string,
  CurrentTotalBalance: string,
  BareTotalBalance: string,
  ActivationNeeded: boolean,
  Activated: ?boolean,
};

export type Balance = {
  NumDeposits: number,
  CurrencyISO: string,
  CurrentBonusBalance: Money,
  CurrentRealBalance: Money,
  CurrentLoyaltyPoints: number,
  VIPLevel: number,
  PromotionPlayerStatuses: {
    PromotionPlayerStatus: {...},
  },
  ...
};

export type ExtendedBalance = {
  ui: UIBalance,
} & Balance;
