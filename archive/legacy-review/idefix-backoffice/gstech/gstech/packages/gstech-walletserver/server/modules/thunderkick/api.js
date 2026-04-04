/* @flow */
import type {
  LaunchDemoGameRequest,
  LaunchGameRequest,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const logger = require('gstech-core/modules/logger');
const ThunderkickGame = require('./ThunderkickGame');
const ThunderkickAPI = require('./ThunderkickAPI');
const config = require('../../../config');

const configuration = config.providers.thunderkick;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo>  => {
  let playerSessionId;
  let playerId;
  const isMobile = launchGameRequest.parameters != null && launchGameRequest.parameters.mobile;
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  try {
    logger.debug('Logging in player', launchGameRequest.player, sessionId);
    playerSessionId = await ThunderkickAPI.login(launchGameRequest.player, sessionId);
    logger.debug('Login ok', playerSessionId);
  } catch (e) {
    logger.debug('Player login failed', e);
    try {
      logger.debug('Registering player');
      playerId = await ThunderkickAPI.register(launchGameRequest.player);
      logger.debug('Player registered', playerId);
      playerSessionId = await ThunderkickAPI.login(launchGameRequest.player, sessionId);
    } catch (e2) {
      logger.debug('Player registration + login failed', e2);
      throw e2;
    }
  }

  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: await ThunderkickGame.launchGame(
      launchGameRequest.game.manufacturerGameId,
      configuration.operatorId,
      playerSessionId,
      configuration.jurisdiction,
      launchGameRequest.parameters != null ? launchGameRequest.parameters.lobbyUrl : '',
      launchGameRequest.player.languageId,
      launchGameRequest.player.currencyId,
      launchGameRequest.parameters != null ? launchGameRequest.parameters.bankingUrl : '',
      isMobile,
    ),
  };
  return result;
};

const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo>  => {
  const isMobile = launchDemoGameRequest.parameters != null && launchDemoGameRequest.parameters.mobile;
  const g = await ThunderkickGame.launchDemoGame(launchDemoGameRequest.game.manufacturerGameId, configuration.operatorId, configuration.jurisdiction, launchDemoGameRequest.parameters != null ? launchDemoGameRequest.parameters.lobbyUrl : '', launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, isMobile);
  return { game: g };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
};

module.exports = gameProvider;
