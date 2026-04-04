/* @flow */
import type { GameProvider } from '../constants';
import type {
  GetLeaderBoardResponse,
  GetJackpotsRequest,
  GetJackpotsResponse,
  CreditFreeSpinsRequest,
  CreateFreeSpinsRequest,
  CreateFreeSpinsResponse,
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from './walletserver-api-types';

const config = require('../config');
const request = require('../request')('walletserver-api api', config.api.walletServer.private);

const launchGame = async (brandId: BrandId, manufacturerId: GameProvider, launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> =>
  request('POST', `/${brandId}/game/${manufacturerId}`, launchGameRequest);

const launchDemoGame = async (brandId: BrandId, manufacturerId: GameProvider, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> =>
  request('POST', `/${brandId}/game/${manufacturerId}/demo`, launchDemoGameRequest);

const creditFreeSpins = async (brandId: BrandId, manufacturerId: GameProvider, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<OkResult> =>
  request('POST', `/${brandId}/creditfreespins/${manufacturerId}`, creditFreeSpinsRequest);

const getJackpots = async (brandId: BrandId, manufacturerId: GameProvider, getJackpotsRequest: GetJackpotsRequest): Promise<GetJackpotsResponse> =>
  request('POST', `/${brandId}/getjackpots/${manufacturerId}`, getJackpotsRequest);

const getLeaderBoard = async (brandId: BrandId, manufacturerId: GameProvider, achievement: string): Promise<GetLeaderBoardResponse> =>
  request('POST', `/${brandId}/getleaderboard/${manufacturerId}/${achievement}`);

const ping = async (brandId: BrandId, manufacturerId: GameProvider): Promise<OkResult> =>
  request('POST', `/${brandId}/ping/${manufacturerId}`);

const createFreeSpins = async (manufacturerId: GameProvider, createFreeSpinsRequest: CreateFreeSpinsRequest): Promise<CreateFreeSpinsResponse> =>
  request('POST', `/createfreespins/${manufacturerId}`, createFreeSpinsRequest);

module.exports = {
  launchGame,
  launchDemoGame,
  creditFreeSpins,
  getJackpots,
  getLeaderBoard,
  ping,
  createFreeSpins,
};
