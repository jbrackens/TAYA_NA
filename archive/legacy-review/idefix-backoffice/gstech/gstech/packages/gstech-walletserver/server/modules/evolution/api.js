/* @flow */
import type {
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');

const { getExternalPlayerId, returnGameScript } = require('gstech-core/modules/helpers');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const EvolutionAPI = require('./EvolutionAPI');

const configuration = config.providers.evolution;

const returnIFrameGameScript = (url: string) => {
  const result = {
    html: `<!doctype html>
         <html>
          <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/>
          <style type="text/css">
              html,body {
                margin: 0;
                padding: 0;
                height:100%;
                width:100%;
                overflow:hidden;
              }
              iframe {
                padding: 0;
                margin: 0;
                border: none;
              }
            </style>
            <script src="https://studio.evolutiongaming.com/mobile/js/iframe.js"></script>
          </head>
          <body>
            <script>
              EvolutionGaming.init({ url: "${url}", topBar: 0 });
            </script>
          </body>
        </html>`,
  };
  return result;
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game, client } = launchGameRequest;
  const { forceIframe } = parameters;
  const tableId = parameters && parameters.options && parameters.options.tableId;
  const isMobile = (parameters != null && parameters.mobile) || false;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const bankingUrl = parameters && parameters.bankingUrl;

  if (!tableId || typeof tableId !== 'string')
    throw new Error('Found no tableId for game')

  const response = await EvolutionAPI.authenticate(player, sessionId, client, game.manufacturerGameId, tableId, isMobile, lobbyUrl, bankingUrl);

  logger.debug('Evolution launch game', parameters, response);

  const url = `https://${configuration.hostname}${response.entry}`;
  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: forceIframe ? returnIFrameGameScript(url) : returnGameScript(url),
  };
  return result;
};

// eslint-disable-next-line no-unused-vars
const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): any => {
  throw new Error('demo game not implemented');
};

const creditFreeSpins = async (brandId: string, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const { player, bonusCode, id } = creditFreeSpinsRequest;
  const [campaignId, initialBalance, maxWinnings] = bonusCode.split(':');
  const { hostname, casino: { key }, api: { password } } = configuration;

  const url = `https://${hostname}/api/free-games/v1/campaigns/${campaignId}/vouchers/issue-one`;
  const body = {
    playerId: getExternalPlayerId({ id: player.id, brandId: player.brandId }),
    currency: player.currencyId,
    winningSettings: { initialBalance, maxWinnings },
  };
  logger.debug('Evolution creditFreeSpins request', { url, body });
  const { data: result } = await axios.request({
    method: 'POST',
    url,
    auth: {
      username: key,
      password,
    },
    data: body,
  });
  logger.debug('Evolution creditFreeSpins response', bonusCode, id, player.username, result);
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
