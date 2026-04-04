/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { Player } from 'gstech-core/modules/types/player';
import type { GameProviderApi } from '../../types';

const querystring = require('querystring');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');

const { returnGameScript, getExternalPlayerId } = require('gstech-core/modules/helpers');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { getJurisdiction } = require('../jurisdiction');

const configuration = config.providers.oryx;

const getWalletCode = (player: Player) => {
   
  const walletCode = getJurisdiction(player) === 'GNRS' ? configuration.germanWalletCodes[player.brandId] : configuration.walletCodes[player.brandId];

  if (!walletCode) {
    throw new Error(`Oryx games are no configured for brand ${player.brandId} in ${player.countryId}`);
  }

  return walletCode;
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game } = launchGameRequest;
  const walletCode = getWalletCode(player);

  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const cashierUrl = parameters && parameters.bankingUrl;
  const params = {
    token: sessionId,
    languageCode: player.languageId,
    playMode: 'REAL',
    ...(isMobile ? { cashierUrl, lobbyUrl } : {}),
  };

  const url = `https://${configuration.gameServer.server}/agg_plus_public/launch/wallets/${walletCode}/games/${game.manufacturerGameId}/open?${querystring.stringify(params)}`;
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

 
const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { parameters, game } = launchDemoGameRequest;
  const walletCode = configuration.walletCodes[brandId];
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const params = {
    languageCode: launchDemoGameRequest.languageId,
    playMode: 'FUN',
    lobbyUrl,
  };

  const url = `https://${configuration.gameServer.server}/agg_plus_public/launch/wallets/${walletCode}/games/${game.manufacturerGameId}/open?${querystring.stringify(params)}`;
  const result = {
    game: returnGameScript(url),
  };

  return result;
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const { player, bonusCode, id } = creditFreeSpinsRequest;
  const walletCode = getWalletCode(player);
  const { apiServer } = configuration;
  // TODO: what happens here if no auth is obtained?
  const { auth } = configuration.api.find(a => a.walletCode === walletCode) || {};
  const url = `https://${apiServer}/bos/agg/wallets/${walletCode}/fr/v1/template/award`;

  const { data: result } = await axios.request({
    method: 'POST',
    url,
    auth,
    data: {
      playerId: getExternalPlayerId(player),
      freeRoundCode: bonusCode,
      externalId: id,
      currencyCode: player.currencyId,
    },
  });
  logger.debug('oryx creditFreeSpins', bonusCode, id, player.username, result);
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
