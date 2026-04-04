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
const moment = require('moment-timezone');
const logger = require('gstech-core/modules/logger');
const PlaynGoGame = require('./PlaynGoGame');
const { getConfiguration } = require('./config');
const api = require('./soap/playngo');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const sessionId = uuid();
  const conf = getConfiguration({
    countryId: launchGameRequest.player.countryId,
    brandId: launchGameRequest.player.brandId,
    currencyId: launchGameRequest.player.currencyId,
  });
  const isMobile = launchGameRequest.parameters != null && launchGameRequest.parameters.mobile;

  const result = {
    session: {
      sessionId,
      type: 'ticket',
      parameters: {
        expires: moment().add(15, 'minutes'),
        gameId: `${launchGameRequest.game.manufacturerGameId}`,
      },
      manufacturerId: conf.manufacturerId,
    },
    game: await PlaynGoGame.launchGame(
      conf,
      launchGameRequest.player.brandId,
      launchGameRequest.player.countryId,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.player.languageId,
      launchGameRequest.parameters,
      isMobile,
    ),
  };
  logger.debug('PlaynGo launchGame', result);
  return result;
};

const launchDemoGame = async (
  brandId: BrandId,
  launchDemoGameRequest: LaunchDemoGameRequest,
): Promise<DemoGameLaunchInfo> => {
  const conf = getConfiguration({
    brandId,
    currencyId: launchDemoGameRequest.currencyId,
    countryId: '',
  });
  const isMobile =
    launchDemoGameRequest.parameters != null && launchDemoGameRequest.parameters.mobile;
  const g = await PlaynGoGame.launchDemoGame(
    conf,
    brandId,
    launchDemoGameRequest.game.manufacturerGameId,
    launchDemoGameRequest.languageId,
    launchDemoGameRequest.currencyId,
    launchDemoGameRequest.parameters,
    isMobile,
  );
  logger.debug('PlaynGo launchDemoGame', g);
  return { game: g };
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => api.creditFreeSpins(creditFreeSpinsRequest.player, brandId, creditFreeSpinsRequest.games, creditFreeSpinsRequest.bonusCode, creditFreeSpinsRequest.id);

const getLeaderBoard = async (brandId: BrandId, achievement: string): Promise<any> => api.getLeaderBoard(brandId, achievement);

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
  getLeaderBoard,
};

module.exports = gameProvider;
