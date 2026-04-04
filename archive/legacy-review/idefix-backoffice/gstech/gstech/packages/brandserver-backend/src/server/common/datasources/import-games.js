/* @flow */
/* eslint block-scoped-var: 0 */
import type { MappedGame } from "../api";
import type { GameDef } from '../modules/games';

const _ = require('lodash');
const api = require('gstech-core/modules/clients/rewardserver-api');

const logger = require('../logger');
const configuration = require('../configuration');
const g = require('../modules/games');

type GameInfo = {
  Permalink: string,
  Mobile: boolean,
  ExternalGameID: string,
  Name: string,
  Manufacturer: string,
  BlockedCountries: CountryId[],
  GameID: string,
  HasPlayForFun: boolean
};

const validPermalink = (str: string) => encodeURIComponent(str.toLowerCase()) === str;

const resolveGames = (games: MappedGame[]) => {
  const res: { [key: string]: GameInfo } = {};
  for (const game of Array.from(games)) {
    if (!res[game.GameName]) {
      const id = game.GameName;
      res[id] = {
        Permalink: game.Permalink,
        Mobile: game.Mobile,
        ExternalGameID: id,
        Name: game.GameName,
        Manufacturer: game.ManufacturerName,
        BlockedCountries: game.BlockedCountries,
        GameID: game.GameID,
        HasPlayForFun: game.HasPlayForFun === 'true',
      };
    } else {
      logger.debug('Duplicate game id!', game.GameName);
    }
  }
  return res;
};

const evoManufacturerOverride = (game: GameDef) => {
  const { Manufacturer, Keywords } = game;
  if (Manufacturer === 'Evolution') {
    if (Keywords.includes('netent'))
      return {
        ...game,
        ManufacturerOverride: 'NetEnt',
        Keywords: Keywords.replace('evolution', '').trim(),
      };
    if (Keywords.includes('redtigergames'))
      return {
        ...game,
        ManufacturerOverride: 'Red Tiger',
        Keywords: Keywords.replace('evolution', '').trim(),
      };
  }
  return game;
};

module.exports = async (exportData: (id: string, data: any[]) => Promise<string[]>): Promise<Array<string>> => {
  const errors = [];

  const [games, rawData] = await Promise.all([
    g.getAllGames().then(resolveGames),
    api.getGames(configuration.shortBrandId()),
  ]);

  const rows = [...new Map(rawData.map(item => [item.game.permalink, item])).values()];

  const permalinks: { [string]: boolean } = {};
  const gameResults = [];

  const gameList: GameInfo[] = (Object.values(games): any);
  for (const { game: game2, thumbnail: thumbnail2 } of Array.from(rows.filter(x => x.game.active === true && x.game.permalink))) {
    const options = (game2.parameters && Object.entries(game2.parameters).map(p => `${p[0]}=${(p[1]: any)}`)) || [];
    options.push(game2.aspectRatio);

    const permalink = game2.permalink.toLowerCase();

    const optionDetails = game2.parameters || {};

    const gamePermalink = optionDetails.usepermalink ? ((optionDetails.usepermalink: any): string) : permalink;
    const mobilegame = gameList.find(v => v.Permalink === gamePermalink && v.Mobile);
    let game = gameList.find(v => v.Permalink === gamePermalink && !v.Mobile) || mobilegame;

    if (!validPermalink(gamePermalink)) {
      errors.push(`Invalid permalink ${gamePermalink}`);
    }

    if (!game) {
      errors.push(`Backend game not found for permalink: ${gamePermalink} ${JSON.stringify(optionDetails)}`);
      continue; // eslint-disable-line no-continue
    }
    if (!mobilegame) {
      errors.push(`Mobile game not available for permalink: ${gamePermalink} (${game.Manufacturer})`);
    }

    if (permalinks[permalink]) {
      errors.push(`Duplicate permalink! ${permalink}`);
    }
    permalinks[permalink] = true;

    const thumbnail = thumbnail2 && thumbnail2.key;

    if (
      _.includes(game2.parameters, 'netent-live') &&
      _.find<?{ [key: string]: string }, string, any>(
        game2.parameters,
        (x: string) => x.indexOf('netent-live-table=') === 0,
      ) == null
    ) {
      game = games['NTE_lcroulette_sw']; // eslint-disable-line dot-notation
    }

    const Meta = thumbnail2 && thumbnail2.blurhashes;
    const result: GameDef = {
      GameID: game ? game.GameID : undefined,
      MobileGameID: mobilegame ? mobilegame.GameID : undefined,
      Name: game2.name,
      Tags: (game2.tags ? _.keys(game2.tags) : []) || [],
      Options: options,
      Manufacturer: (game || mobilegame).Manufacturer,
      BlockedCountries: game.BlockedCountries || [],
      ManufacturerOverride: game2.manufacturer,
      Jackpot: game2.jackpot || false,
      Thumbnail: thumbnail,
      ViewMode: game2.viewMode,
      Keywords: [game2.manufacturer || (game || mobilegame).Manufacturer, game2.name, game2.keywords]
        .join(' ')
        .trim()
        .toLowerCase(),
      HasPlayForFun: (game || mobilegame).HasPlayForFun,
      Category: game2.primaryCategory,
      New: game2.newGame || false,
      Promoted: game2.promoted,
      Permalink: permalink,
      SearchOnly: game2.searchOnly || false,
      DropAndWins: game2.dropAndWins || false,
      Meta,
    };
    gameResults.push(result);
  }

  const r = _.map(_.compact(gameResults), evoManufacturerOverride);
  errors.push(`Total active games: ${r.length}`);
  await exportData('games', r);
  return errors;
};