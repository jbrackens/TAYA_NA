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

const { getExternalPlayerId, returnGameScript } = require('gstech-core/modules/helpers');
const { common } = require('gstech-core/modules/constants');
const config = require('../../../config');

const configuration = config.providers.eyecon;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, game, parameters } = launchGameRequest;
  const params: any = {
    // $FlowFixMe - this should get fixed once Player types are matched
    uid: getExternalPlayerId(player),
    alias: `${player.firstName} ${player.lastName}`,
    gameid: game.manufacturerGameId,
    guid: sessionId,
    brand: 'LKD',
    lang: player.languageId,
    cur: player.currencyId,
    mode: 'cash',
    homeURL: parameters.lobbyUrl,
  };

  const isMobile = launchGameRequest.parameters != null && launchGameRequest.parameters.mobile;
  if (isMobile) {
    params.RealityCheckStopPlayingMode = 'ER';
    params.RealityCheckRemaining = 60 * (common.realityCheckInMinutes - (launchGameRequest.playTimeInMinutes % common.realityCheckInMinutes));
    params.RealityCheckFrequency = 60 * common.realityCheckInMinutes;
  }

  const url = `https://${configuration.gameServer}/launch/lkd?${querystring.stringify(params)}`;
  const script = 'document.getElementById("gameScriptFrame").contentWindow.postMessage({"name": "stopAutoplay"}, "*")';
  const result = {
    ...(newSession
      ? {
          session: {
            sessionId,
            parameters: { expires: moment().add(15, 'minutes') },
          },
        }
      : {}),
    game: returnGameScript(url, { realityCheckScript: script }),
  };

  return result;
};

const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { game, parameters } = launchDemoGameRequest;
  const params = {
    gameid: game.manufacturerGameId,
    brand: 'LKD',
    lang: launchDemoGameRequest.languageId,
    cur: launchDemoGameRequest.currencyId,
    mode: 'demo',
    homeURL: parameters.lobbyUrl,
  };

  const url = `https://${configuration.gameServer}/launch/lkd?${querystring.stringify(params)}`;
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
