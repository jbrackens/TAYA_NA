/* @flow */
import type { GameProvider } from '../constants';

const request = require('request-promise');
const config = require('../config');
const logger = require('../logger');

const doReq = async (method: HttpMethod, path: string, body: mixed, headers: mixed): Promise<any> => {
  logger.debug('walletserver-api request', method, path, body, headers);
  const options = {
    uri: `${config.api.walletServer.private}${path}`,
    method,
    json: true,
    body,
    headers,
  };
  const response = await request(options);

  logger.debug('walletserver-api response', method, path, response);
  return response;
};

const launchGame = async (brandId: BrandId, manufacturerId: GameProvider, launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> =>
  doReq('POST', `/${brandId}/game/${manufacturerId}`, launchGameRequest);

const launchDemoGame = async (brandId: BrandId, manufacturerId: GameProvider, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> =>
  doReq('POST', `/${brandId}/game/${manufacturerId}/demo`, launchDemoGameRequest);

const creditFreeSpins = async (brandId: BrandId, manufacturerId: GameProvider, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<OkResult> =>
  doReq('POST', `/${brandId}/creditfreespins/${manufacturerId}`, creditFreeSpinsRequest);

const getJackpots = async (brandId: BrandId, manufacturerId: GameProvider, getJackpotsRequest: GetJackpotsRequest): Promise<GetJackpotsResponse> =>
  doReq('POST', `/${brandId}/getjackpots/${manufacturerId}`, getJackpotsRequest);

const getLeaderBoard = async (brandId: BrandId, manufacturerId: GameProvider, achievement: string): Promise<GetLeaderBoardResponse> =>
  doReq('POST', `/${brandId}/getleaderboard/${manufacturerId}/${achievement}`);

const ping = async (brandId: BrandId, manufacturerId: GameProvider): Promise<OkResult> =>
  doReq('POST', `/${brandId}/ping/${manufacturerId}`);

module.exports = {
  launchGame,
  launchDemoGame,
  creditFreeSpins,
  getJackpots,
  getLeaderBoard,
  ping,
};
