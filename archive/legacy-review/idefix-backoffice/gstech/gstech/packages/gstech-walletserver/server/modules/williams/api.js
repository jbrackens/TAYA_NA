/* @flow */
import type {
  LaunchDemoGameRequest,
  LaunchGameRequest,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const WilliamsGame = require('./WilliamsGame');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo>  => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: WilliamsGame.launchGame(
      launchGameRequest.player.brandId,
      launchGameRequest.game.manufacturerGameId,
      launchGameRequest.player.id,
      sessionId,
      launchGameRequest.player.languageId,
      launchGameRequest.parameters,
      launchGameRequest.game.mobileGame,
    ),
  };
  return result;
};

const launchDemoGame = async (
  brandId: BrandId,
  launchDemoGameRequest: LaunchDemoGameRequest,
): Promise<DemoGameLaunchInfo> => {
  const g = WilliamsGame.launchDemoGame(
    brandId,
    launchDemoGameRequest.game.manufacturerGameId,
    launchDemoGameRequest.languageId,
    launchDemoGameRequest.currencyId,
    launchDemoGameRequest.parameters,
    launchDemoGameRequest.game.mobileGame,
  );
  return { game: g };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
};

module.exports = gameProvider;
