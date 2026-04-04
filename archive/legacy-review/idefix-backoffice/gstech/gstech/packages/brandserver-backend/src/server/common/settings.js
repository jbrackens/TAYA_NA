/* @flow */
import type { GameDef } from './modules/games';

const assert = require('assert');
const redis = require('./redis');
const importBanners = require('./datasources/import-banners');
const importGames = require('./datasources/import-games');
const importContentful = require('./datasources/import-contentful');

const datasources: {
  [ContentType]: {
    datasource: (...any) => Promise<Array<string>>,
    processor: void | ((data: any) => any),
  },
} = {};

const parseGames = (games: GameDef[]) => {
  const permalinks: { [string]: GameDef } = {};
  const allGames = [];
  const mobileGames = [];
  const freetoplay = [];
  const mobileFreetoplay = [];

  for (const game of Array.from(games)) {
    assert(!permalinks[game.Permalink], `Duplicate permalinks! ${game.Permalink}`);
    permalinks[game.Permalink] = game;
    if (game.GameID) allGames.push(game);
    if (game.MobileGameID) mobileGames.push(game);
    if (game.HasPlayForFun) {
      if (game.GameID) freetoplay.push(game);
      if (game.MobileGameID) mobileFreetoplay.push(game);
    }
  }
  return { permalinks, allGames, freetoplay, mobileGames, mobileFreetoplay };
};

export type ContentType = 'banners' | 'contentful' | 'games';

const registerParser = (
  key: ContentType,
  datasource: (...any) => Promise<string[]>,
  processor?: (data: any) => any,
) => {
  datasources[key] = {
    datasource,
    processor,
  };
};

registerParser('banners', importBanners);
registerParser('contentful', importContentful);
registerParser('games', importGames, parseGames);

const update = async (key: ContentType): Promise<?(string[])> => {
  const s = datasources[key];
  if (s == null) return;
  const { datasource, processor } = s;
  const exporter = (id: string, data: any) => redis.set(id, processor ? processor(data) : data);
  return await datasource(exporter);
};

const init = async () => {
  await Promise.all([update('banners'), update('contentful'), update('games')]);
};

module.exports = { update, init };
