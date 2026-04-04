/* @flow */
import type {
  GetJackpotsRequest,
  LaunchDemoGameRequest,
  LaunchGameRequest,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const querystring = require('querystring');
const { parseString, processors } = require('xml2js');
const { promisify } = require('util');
const _ = require('lodash');

const { axiosRetry } = require('gstech-core/modules/axios');
const YggdrasilGame = require('./YggdrasilGame');
const config = require('../../../config');

const configuration = config.providers.yggdrasil;
const defaultConfiguration = configuration.environments[0];

const parseXml = promisify(parseString);
const parse = (xml: string) => parseXml(xml, {
  attrNameProcessors: [processors.stripPrefix],
  tagNameProcessors: [processors.stripPrefix],
});

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const result = {
    ...(newSession
      ? {
          session: {
            sessionId,
            manufacturerId: defaultConfiguration.manufacturerId,
          },
        }
      : {}),
    game: await YggdrasilGame.launchGame(
      launchGameRequest.player.brandId,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.player.languageId,
      launchGameRequest.player.currencyId,
      launchGameRequest.parameters,
    ),
  };
  return result;
};

const launchDemoGame = async (
  brandId: BrandId,
  launchDemoGameRequest: LaunchDemoGameRequest,
): Promise<DemoGameLaunchInfo> => {
  const g = await YggdrasilGame.launchDemoGame(
    brandId,
    launchDemoGameRequest.game.manufacturerGameId,
    launchDemoGameRequest.languageId,
    launchDemoGameRequest.currencyId,
    launchDemoGameRequest.parameters,
  );
  return { game: g };
};

const getJackpots = async (brandId: BrandId, getJackpotsRequest: GetJackpotsRequest) => {
  const brandConfig = configuration.brands[brandId];

  const allCurrencies = await Promise.all(getJackpotsRequest.currencies.map(async (currency) => {
    const params = {
      org: brandConfig.org,
      currency,
    };

    const { data: response } = await axiosRetry.get(
      `${defaultConfiguration.jackpotsUrl}/?${querystring.stringify(params)}`,
      { responseType: 'text' }
    );
    const xml = await parse(response);
    const jackpots = xml.jackpotListing.jackpot;
    if (jackpots) {
      const allGames = getJackpotsRequest.games.map((game) => {
        const jp = _.first(jackpots.filter(v => v.type[0] === 'pooled' && v.gameid[0] === game.manufacturerGameId));
        if (jp != null) {
          const item = jp.values[0].value[0];
          const amount = item.amount[0];
          return { currency, amount, gameId: game.gameId };
        }
        return {};
      });
      const existingGames = allGames.filter(v => Object.keys(v).length !== 0);
      return existingGames;
    }
    return ([]: any[]);
  }));

  const result = _.values(_.groupBy(_.flatten(allCurrencies), 'gameId')).map((group) => {
    const details = group.map(g => ({ amount: g.amount, currency: g.currency }));
    const game = { game: group[0].gameId, currencies: details };
    return game;
  });

  return result;
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  getJackpots,
};

module.exports = gameProvider;
