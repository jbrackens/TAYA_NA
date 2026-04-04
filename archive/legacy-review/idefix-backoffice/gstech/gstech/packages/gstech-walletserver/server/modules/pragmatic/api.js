/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  LaunchDemoGameRequest,
  LaunchGameRequest,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const PragmaticGame = require('./PragmaticGame');
const api = require('./soap/pragmatic');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo>  => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: await PragmaticGame.launchGame(
      launchGameRequest.player,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.parameters,
    ),
  };
  return result;
};

const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo>  => {
  const g = await PragmaticGame.launchDemoGame(brandId, launchDemoGameRequest.game.manufacturerGameId, launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, launchDemoGameRequest.parameters);
  return { game: g };
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => api.creditFreeSpins(creditFreeSpinsRequest.player, brandId, creditFreeSpinsRequest.bonusCode, creditFreeSpinsRequest.id);

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
