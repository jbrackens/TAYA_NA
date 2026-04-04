/* @flow */
import type { Config } from 'gstech-core/modules/types/config';
import type { GoogleApiConfig } from 'gstech-core/modules/sheets';

export type RewardserverConfiguration = {
  sheets: {
    [brandId: BrandId]: {
      games: string,
      rewards: string,
    },
  },
  google: {
    api: GoogleApiConfig,
  },
};

export type RewardserverConfig = {
  ...RewardserverConfiguration,
  ...Config,
};
