/* @flow */
import type { RequestContext, Journey } from './api';
import type { GameDef } from './modules/games';

const _ = require('lodash');
const metadata = require('./metadatalite');
const utils = require('./utils');
const logger = require('./logger');
const configuration = require('./configuration');

const currencies = configuration.requireProjectFile('./data/currencies');
const countries = configuration.requireProjectFile('./data/countries');
const datastorage = require('./datastorage');
const { recommend } = require('./modules/recommendations');
const { blockedCountries } = require('./datasources/blocked-countries');

const blockedCountryCodes = blockedCountries
  .map(({ blocked, prefix }) => (blocked ? prefix : 0))
  .filter((value) => value);

const availableSizes = ['max', 'single']; // Order matters, first one is preferred

const currencyMapping = {
  SE: 'SEK',
  NO: 'NOK',
  UK: 'GBP',
  RU: 'USD',
  CA: 'CAD',
};

const filterBlockedGames = (games: GameDef[], journey?: Journey) =>
  games.filter(
    (game) =>
      journey == null ||
      (journey.checkTags(game.Tags) &&
        !game.BlockedCountries.includes(journey.req.context.countryISO)),
  );

module.exports = {
  currencies(): Promise<mixed> {
    return Promise.resolve(currencies);
  },
  countries(): Promise<mixed> {
    return Promise.resolve(countries);
  },
  blockedCountryCodes(): Array<number> {
    return blockedCountryCodes;
  },
  findFreeGame(permalink: string): Promise<GameDef> {
    const { permalinks } = datastorage.games();
    const game = permalinks[permalink];
    if (game) {
      return Promise.resolve(game);
    }
    return Promise.reject(`Game not found ${permalink}`);
  },
  game(permalink: string): {
    Category: string,
    GameID: ?string,
    Group?: string,
    HasPlayForFun: boolean,
    Jackpot: boolean,
    JackpotValue?: string,
    Keywords: string,
    Manufacturer: string,
    BlockedCountries: CountryId[],
    ManufacturerOverride: ?string,
    Meta: { [key: string]: any },
    MobileGameID: ?string,
    Name: string,
    New: boolean,
    Promoted: boolean,
    Options: Array<string>,
    Permalink: string,
    SearchOnly: boolean,
    Tags: Array<string>,
    Thumbnail: string,
    ViewMode: string,
    DropAndWins: boolean,
  } {
    const { permalinks } = datastorage.games();
    const game = permalinks[permalink];
    return game;
  },
  getGame(permalink: string): Promise<GameDef> {
    const { permalinks } = datastorage.games();
    const game = permalinks[permalink];
    if (game != null) {
      return Promise.resolve(game);
    }
    return Promise.reject(`Game not found ${permalink}`);
  },
  findGame(permalink: string, journey?: Journey): Promise<GameDef> {
    const { permalinks } = datastorage.games();
    const game = permalinks[permalink];
    const games = filterBlockedGames(game ? [game] : [], journey);
    if (games.length > 0) {
      return Promise.resolve(games[0]);
    }
    logger.debug(
      'findGame blocked',
      { permalink, game, games },
      journey != null ? journey.tags : 'no journey!',
    );
    return Promise.reject({ ErrorNo: 'game-not-allowed', Description: 'Game not allowed' });
  },

  phoneRegions(): Promise<Array<any>> {
    const regions = [];
    for (const key in metadata) {
      const value = metadata[key];
      if (!_.includes(blockedCountryCodes, parseInt(key)))
        regions.push({ code: `+${key}`, countries: value });
    }
    return Promise.resolve(_.sortBy<any>(regions, (x) => x.code));
  },

  games(context: RequestContext, journey: Journey): Array<GameDef> {
    const { allGames, mobileGames } = datastorage.games();
    const result = context.playerId !== -1
      ? recommend(journey.req, context.mobile ? mobileGames : allGames)
      : context.mobile ? mobileGames : allGames || [];

    const jackpots = datastorage.jackpots();
    const result2 = result.map((game, index) => {
      const jp =
        jackpots[game.Permalink] != null
          ? jackpots[game.Permalink][context.currencyISO]
          : undefined;
      const JackpotValue =
        jp != null ? utils.money({ code: 'en' })(jp, context.currencyISO, false) : undefined;
      let { ViewMode } = game;
      if (index < 3) {
        ViewMode = _.first(_.intersection(availableSizes, _.keys(game.Meta)));
      }
      return _.extend({ JackpotValue }, game, { ViewMode });
    });

    return filterBlockedGames(result2 || [], journey);
  },

  permalinks(): { [key: string]: GameDef } {
    return datastorage.games().permalinks;
  },

  countryToCurrency(countryISO: string): any {
    // $FlowFixMe[invalid-computed-prop]
    return currencyMapping[countryISO] || _.first(currencies).CurrencyISO;
  },

  currencySymbol(currencyISO: string): any | string {
    return (
      __guard__(
        _.find(currencies, (x) => x.CurrencyISO === currencyISO),
        (x) => x.CurrencySymbol,
      ) || currencyISO
    );
  },
};

function __guard__<T,U>(value: ?T, transform: (arg0: T) => U): ?U {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
