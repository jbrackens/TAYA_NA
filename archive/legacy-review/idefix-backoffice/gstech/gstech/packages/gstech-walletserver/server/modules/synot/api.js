/* @flow */
import type {
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const querystring = require('querystring');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');

const { returnGameScript } = require('gstech-core/modules/helpers');
const config = require('../../../config');

const configuration = config.providers.synot;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game } = launchGameRequest;
  const { manufacturerGameId: gameCode } = game;
  const { server, customer } = configuration.api;
  const channel = 'Auto';
  const customerOperation = 'Default';
  const crumb = !config.isProduction ? '/Backend' : '';

  const params = {
    lang: player.languageId,
    exitUrl: parameters && parameters.lobbyUrl,
    token: sessionId,
  };


  const url = `https://${server}${crumb}/Launch/${customer}/${channel}/${gameCode}/${customerOperation}?${querystring.stringify(params)}`;
  const result = {
    ...(newSession
      ? {
          session: {
            sessionId,
            parameters: { expires: moment().add(20, 'minutes') },
          },
        }
      : {}),
    game: returnGameScript(url),
  };

  return result;
};

 
const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { parameters, game, languageId, currencyId } = launchDemoGameRequest;
  const { manufacturerGameId: gameCode } = game;
  const { pff_server: server, customer } = configuration.api;
  const channel = 'Auto';
  const customerOperation = 'Default';
  const params = {
    lang: languageId,
    exitUrl: parameters && parameters.lobbyUrl,
    currency: currencyId,
  };

  const url = `https://${server}/Launch/${customer}/${channel}/${gameCode}/${customerOperation}?${querystring.stringify(params)}`;
  const result = {
    game: returnGameScript(url),
  };

  return result;
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
};

module.exports = gameProvider;
