/* @flow */
import type {
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const { returnGameScript } = require('gstech-core/modules/helpers');
const client = require('gstech-core/modules/clients/backend-wallet-api');

const BoomingAPI = require('./BoomingAPI');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const { player, parameters, game } = launchGameRequest;
  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const bankingUrl = parameters && parameters.bankingUrl;

  const balance = await client.getBalance(player.id);
  const response = await BoomingAPI.authenticate(player, player.brandId, balance.balance, player.currencyId, player.languageId, game.gameId, game.manufacturerGameId, isMobile, false, lobbyUrl, bankingUrl);

  const result = {
    game: returnGameScript(response.play_url),
    session: { sessionId: response.session_id },
  };

  return result;
};

 
const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { parameters, game, currencyId, languageId } = launchDemoGameRequest;
  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;

  const response = await BoomingAPI.authenticate(null, ((brandId: any): BrandId), 10000, currencyId, languageId, game.gameId, game.manufacturerGameId, isMobile, true, lobbyUrl, null);

  const result = {
    game: returnGameScript(response.play_url),
  };

  return result;
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
};

module.exports = gameProvider;
