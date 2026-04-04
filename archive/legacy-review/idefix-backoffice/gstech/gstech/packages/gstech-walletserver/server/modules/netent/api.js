/* @flow */
import type {
  GetJackpotsRequest,
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  LaunchDemoGameRequest,
  LaunchGameRequest,
  GetLeaderBoardResponse,
  GetJackpotsResponse,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const logger = require('gstech-core/modules/logger');
const { loginUserDetailed, isUserSessionAlive, getConfiguration } = require('./CasinoModule');
const NetentGame = require('./NetentGame');
const api = require('./soap/netent');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  let sessionId: ?string = null;
  const gameType = launchGameRequest.game.mobileGame ? 'mobile' : 'desktop';
  const validSessions = launchGameRequest.sessions.filter(({ type }) => type === gameType);
  const conf = getConfiguration(launchGameRequest.player);
  if (validSessions.length > 0) {
    const sid = validSessions[0].sessionId;
    const alive = await isUserSessionAlive(launchGameRequest.player, sid);
    if (alive) sessionId = sid;
  }
  const session =
    sessionId == null
      ? {
          sessionId: await loginUserDetailed(
            launchGameRequest.player,
            launchGameRequest.game.mobileGame,
          ),
          type: gameType,
          manufacturerId: conf.manufacturerId,
        }
      : { sessionId };
  const result = {
    ...(sessionId == null ? { session } : {}),
    game: NetentGame.launchGame(
      launchGameRequest.player.brandId,
      launchGameRequest.game.manufacturerGameId,
      session.sessionId,
      launchGameRequest.player.languageId,
      launchGameRequest.player.currencyId,
      launchGameRequest.player.countryId,
      launchGameRequest.parameters,
      launchGameRequest.game.mobileGame,
    ),
  };
  logger.debug('NetEnt launchGame', result);
  return result;
};

const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const g = NetentGame.launchDemoGame(brandId, launchDemoGameRequest.game.manufacturerGameId, launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, launchDemoGameRequest.parameters, launchDemoGameRequest.game.mobileGame);
  return { game: g };
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  await loginUserDetailed(creditFreeSpinsRequest.player, false);
  return api.creditFreeSpins(creditFreeSpinsRequest.player, brandId, creditFreeSpinsRequest.bonusCode, creditFreeSpinsRequest.id);
};

const getJackpots = async (brandId: BrandId, getJackpotsRequest: GetJackpotsRequest): Promise<GetJackpotsResponse> => (api.getJackpots(brandId, getJackpotsRequest): any);

const getLeaderBoard = async (brandId: BrandId, achievement: string): Promise<GetLeaderBoardResponse> => api.getLeaderBoard(brandId, achievement);

const ping = async (brandId: BrandId): Promise<OkResult> => api.ping(brandId);

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
  getJackpots,
  getLeaderBoard,
  ping,
};

module.exports = gameProvider;
