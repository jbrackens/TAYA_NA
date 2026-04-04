/* @flow */
import type {
  GetJackpotsRequest,
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  DemoGameLaunchInfo,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  GetJackpotsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const { v1: uuid } = require('uuid');

const LottoWarehouseGame = require('./LottoWarehouseGame');
const config = require('../../../config');

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const isMobile = launchGameRequest.parameters != null && launchGameRequest.parameters.mobile;
  const lobbyUrl = launchGameRequest.parameters != null ? launchGameRequest.parameters.lobbyUrl : '';

  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: await LottoWarehouseGame.launchGame(launchGameRequest.game.manufacturerGameId, sessionId, isMobile, lobbyUrl)
  }
  return result;
};

const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => { // eslint-disable-line no-unused-vars
  throw new Error('demo game not implemented');
};

const creditFreeSpins = async (brandId: string, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const parts = creditFreeSpinsRequest.bonusCode.split(':');
  if (parts.length !== 2) throw new Error(`Promotion code '${creditFreeSpinsRequest.bonusCode}' has invalid format`);

  const [gameName, lines] = parts;
  const { data: response } = await axios.post(
    `${config.backend.lottoBackend}/freelines/${creditFreeSpinsRequest.player.id}/${gameName}/${lines}`,
  );

  return { ok: response.message === 'Ok' };
};

const getJackpots = async (brandId: string, getJackpotsRequest: GetJackpotsRequest): Promise<GetJackpotsResponse> => {
  const jackpots = await Promise.all(getJackpotsRequest.games.map(async (game) => {
    const allCurrencies = await Promise.all(getJackpotsRequest.currencies.map(async (currency) => {
      const { data: response } = await axios.get(
        `${config.backend.lottoBackend}/jackpot/${game.manufacturerGameId}/${currency}`,
      );

      return response.data;
    }));

    const existingCurrencies = allCurrencies.filter(v => Object.keys(v).length !== 0);
    const jackpot = { game: game.gameId, currencies: existingCurrencies };
    return jackpot;
  }));

  return jackpots;
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
  getJackpots,
};

module.exports = gameProvider;
