/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
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
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.elk;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game } = launchGameRequest;

  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;

  const params = {
    gameid: game.manufacturerGameId,
    operatorid: configuration.operatorId,
    currency: player.currencyId,
    language: player.languageId,
    mode: 'real',
    device: isMobile ? 'mobile' : 'desktop',
    token: sessionId,
    lobbyurl: lobbyUrl,
  };

  const url = `https://${configuration.gameServer}/1.0/game?${querystring.stringify(params)}`;
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

  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;

  const params = {
    gameid: game.manufacturerGameId,
    operatorid: configuration.operatorId,
    currency: currencyId,
    language: languageId,
    mode: 'demo',
    device: isMobile ? 'mobile' : 'desktop',
    lobbyurl: lobbyUrl,
  };

  const url = `https://${configuration.gameServer}/1.0/game?${querystring.stringify(params)}`;
  const result = {
    game: returnGameScript(url),
  };

  return result;
};

const creditFreeSpins = async (brandId: string, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const { player, bonusCode, id } = creditFreeSpinsRequest;

  logger.debug('elk creditFreeSpins', bonusCode, id, player.username);
  return { ok: false };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
