/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');

const api = require('gstech-core/modules/clients/backend-wallet-api');
const { returnGameScript, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { nickName } = require('gstech-core/modules/clients/backend-wallet-api');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.bfgames;

const launchUrlMapping = {
  CJ: 'casinojefe',
  FK: 'fiksukasino',
  KK: 'kalevalakasino',
  LD: 'luckydino',
  OS: 'olaspill',
  SN: 'freshspinscom',
  VB: 'viebet',
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const { player, parameters, game, client } = launchGameRequest;
  const isMobile = parameters != null && parameters.mobile;

  let sessionId;
  if (launchGameRequest.sessions.length === 0) {
    sessionId = uuid();
    await api.createManufacturerSession(
      launchGameRequest.sessionId,
      'BFG',
      'game',
      sessionId,
      {},
      player.id,
    );
  } else {
    sessionId = launchGameRequest.sessions[0].sessionId;
  }

  const operator = config.isProduction ? launchUrlMapping[player.brandId] : 'giantgaming';
  const url = `https://${configuration.api.host}/gamehub/${operator}/game/start`;
  const body = {
    gameId: game.manufacturerGameId,
    gameMode: 'real',
    currency: player.currencyId,
    playerId: getExternalPlayerId(player),
    sessionToken: sessionId,
    language: player.languageId.toUpperCase(),
    playerIP: client.ipAddress.length > 15 ? '240.16.0.1' : client.ipAddress,
    playerName: nickName(player),
    platform: isMobile ? 'mobile' : 'desktop',
    license: 'mga',
  };
  logger.debug('>>> BFG launchGame', { url, body });
  const { data: response } = await axios.request({
    method: 'POST',
    url,
    data: body,
    headers: { 'x-api-key': configuration.api.key },
  });
  logger.debug('<<< BFG launchGame', { response });
  return { game: returnGameScript(response.url) };
};

 
const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { game, parameters, currencyId, languageId, client } = launchDemoGameRequest;
  const isMobile = parameters != null && parameters.mobile;

  const operator = config.isProduction ? launchUrlMapping[brandId] : 'giantgaming';
  const { data: response } = await axios.request({
    method: 'POST',
    url: `https://${configuration.api.host}/gamehub/${operator}/game/start`,
    headers: {
      'x-api-key': configuration.api.key,
    },
    data: {
      gameId: game.manufacturerGameId,
      gameMode: 'demo',
      currency: currencyId,
      playerId: uuid(),
      language: languageId.toUpperCase(),
      playerIP: client.ipAddress,
      platform: isMobile ? 'mobile' : 'desktop',
      license: 'mga',
    },
  });

  const result = {
    game: returnGameScript(response.url),
  };

  return result;
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const { player, sessionId, bonusCode, id, client } = creditFreeSpinsRequest;
  const [bonusProgram, game, roundsCount] = bonusCode.split(':');
  const operator = config.isProduction ? launchUrlMapping[brandId] : 'giantgaming';

  logger.debug('bfgames creditFreeSpins request', { creditFreeSpinsRequest });

  const manufacturerSessionId = uuid();
  await api.createManufacturerSession(
    sessionId,
    'BFG',
    'game',
    manufacturerSessionId,
    {},
    player.id,
  );

  const playerRequestBody = {
    gameId: game,
    gameMode: 'real',
    currency: player.currencyId,
    playerId: getExternalPlayerId(player),
    sessionToken: manufacturerSessionId,
    language: player.languageId.toUpperCase(),
    playerIP: client.ipAddress,
    playerName: nickName(player),
    platform: 'desktop',
    license: 'mga',
  };

  logger.debug('bfgames creditFreeSpins initialize player request', { playerRequestBody });
  const { data: response } = await axios.request({
    method: 'POST',
    url: `https://${configuration.api.host}/gamehub/${operator}/game/start`,
    headers: {
      'x-api-key': configuration.api.key,
    },
    data: playerRequestBody,
  });

  logger.debug('bfgames creditFreeSpins initialize player response', { response });

  const body = {
    playerId: getExternalPlayerId({ id: player.id, brandId }),
    bonusInstanceId: id,
    bonusProgram,
    currency: player.currencyId,
    games: [game],
    roundsCount,
  };

  const url = `https://${configuration.api.host}/gamehub/${operator}/bonus`;

  logger.debug('bfgames creditFreeSpins request', { body, url });

  const { data: result } = await axios.request({
    method: 'POST',
    url,
    headers: {
      'x-api-key': configuration.api.key,
    },
    data: body,
  });

  logger.debug('bfgames creditFreeSpins response', { bonusCode, id, player, result });
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
