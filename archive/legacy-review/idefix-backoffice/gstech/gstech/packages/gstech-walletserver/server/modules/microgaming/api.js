/* @flow */
import type {
  GetJackpotsRequest,
  LaunchDemoGameRequest,
  LaunchGameRequest,
  GetJackpotsResponse,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';
import type { MicrogamingJackpot } from './types';

const { axios } = require('gstech-core/modules/axios');
const { v1: uuid } = require('uuid');
const moment = require('moment-timezone');
const _ = require('lodash');

const logger = require('gstech-core/modules/logger');
const MicrogamingGame = require('./MicrogamingGame');
const config = require('../../../config');

const configuration = _.first(config.providers.microgaming);

const jackpotMapping = { // manufacturerGameId: friendlyName
  'Absolutely Mad Mega Moolah': 'Absolootly Mad',
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  let sessionId;
  const conf = MicrogamingGame.getConf();

  const newSession =
    launchGameRequest.sessions.filter(
      (s) =>
        s.type === 'ticket' &&
        (!s.parameters ||
          !s.parameters.expires ||
          !moment(s.parameters.expires).isBefore(moment())),
    ).length === 0;
  if (newSession) sessionId = uuid();
  else sessionId = launchGameRequest.sessions[0].sessionId;

  const result = {
    ...(newSession
      ? {
          session: {
            sessionId,
            type: 'ticket',
            parameters: { expires: moment().add(15, 'minutes') },
            manufacturerId: conf.manufacturerId,
          },
        }
      : {}),
    game: await MicrogamingGame.launchGame(
      launchGameRequest.player,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.parameters,
      launchGameRequest.game.mobileGame,
    ),
  };
  logger.debug('Microgaming launchGame', result);
  return result;
};

const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const g = await MicrogamingGame.launchDemoGame(brandId, launchDemoGameRequest.game.manufacturerGameId, launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, launchDemoGameRequest.parameters, launchDemoGameRequest.game.mobileGame);
  return { game: g };
};

const getJackpots = async (brandId: BrandId, getJackpotsRequest: GetJackpotsRequest): Promise<GetJackpotsResponse> => {
  const { data: mgsJackpots } = await axios.get<MicrogamingJackpot[]>(configuration.jackpotsUrl);

  logger.debug('getJackpots', getJackpotsRequest.games.length);

  const jackpots = await Promise.all(getJackpotsRequest.games.map((game) => {
    const relevantJackpots = mgsJackpots.filter((mgsJackpot) => {
      const foreignName = mgsJackpot.friendlyName.toLowerCase().replace(/\W/g, '');
      const localName = game.manufacturerGameId.toLowerCase().replace(/\W/g, '');
      // $FlowFixMe[invalid-computed-prop]
      return mgsJackpot.friendlyName === jackpotMapping[game.manufacturerGameId] || foreignName === localName;
    });

    const currencies = getJackpotsRequest.currencies.filter(c => c === 'EUR').map((currency) => {
      const relevantEntry = relevantJackpots.find(rj => rj.currencyIsoCode === currency);
      return (relevantEntry && { amount: relevantEntry.startAtValue.toString(), currency }) || {};
    });

    const jackpot: { game: string, currencies: { amount: string, currency: string }[] } = {
      game: game.gameId,
      // $FlowFixMe[incompatible-call] - TODO: figure out what this means
      currencies: currencies.filter((c) => c && Object.entries(c).length > 0),
    };
    return jackpot;
  }));

  const validJackpots = jackpots.filter(jp => jp.currencies.length > 0);
  return validJackpots;
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  getJackpots,
};

module.exports = gameProvider;
