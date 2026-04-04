/* @flow */
import type { DataSource } from './redis';
import type { Notification } from './datasources/content-types';
import type { GameDef } from './modules/games';

export type Tournament = {
  startDate: number,
  endDate: number,
  type: 'playngo' | 'idefix',
  promotion: string,
  brands: string[],
};

const redis = require('./redis');

export type GameDefinitions = {
  permalinks: { [key: string]: GameDef },
  allGames: GameDef[],
  mobileGames: GameDef[],
  freetoplay: GameDef[],
  mobileFreetoplay: GameDef[],
};

module.exports = {
  init: redis.init,
  set: redis.set,
  setFlag: redis.setFlag,
  setTemporary: redis.setTemporary,
  getTemporary: redis.getTemporary,
  hasFlag: redis.hasFlag,
  removeFlag: redis.removeFlag,
  jackpots: (redis.registerDataSource('jackpots'): (id: ?string) => any),
  tournaments: (redis.dataSource<Tournament[], Tournament>('tournaments'): DataSource<Tournament[], Tournament>),
  campaigns: (redis.registerDataSource('campaigns', []): (id: ?string) => any),
  // campaigns: redis.dataSource<{ [key: string]: CampaignDef[] }, CampaignDef[]>('campaigns', []),
  banners: (redis.registerDataSource('banners', [], []): (id: ?string) => any),
  // banners: redis.dataSource<{ [key: string]: BannerDef[] }, BannerDef[]>('banners', [], []),

  landers: (redis.registerDataSource('landers'): (id: ?string) => any),
  lander: (redis.registerDataSource('landers'): (id: ?string) => any),
  games: (redis.dataSource<GameDefinitions, GameDefinitions>('games'): DataSource<GameDefinitions, GameDefinitions>),
  notifications: (redis.dataSource<Notification[], Notification>('notifications', []): DataSource<Notification[], Notification>),
};
