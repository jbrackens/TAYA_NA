/* @flow */
import type {
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  CreditFreeSpinsRequest,
  CreditFreeSpinsResponse,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { v1: uuid } = require('uuid');
const axios = require('axios');

const logger = require('gstech-core/modules/logger');
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const config = require('../../../config');

const configuration = config.providers.delasport;

 
const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const result: any = {};
  let sessionId;
  if (launchGameRequest.sessions.length === 0) {
    sessionId = uuid();
    result.session = { sessionId };
  } else {
    sessionId = launchGameRequest.sessions[0].sessionId;
  }
  const { iframeUrl } = configuration;

  result.game = {
    url: `${iframeUrl}/${launchGameRequest.player.languageId}?sb=${sessionId}`,
  };
  logger.debug('Delasport launch', { result });

  return result;
};

// eslint-disable-next-line no-unused-vars
const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): any => {
  const { iframeUrl } = configuration;

  const result = {
    game: {
      url: `${iframeUrl}`,
    },
  };
  logger.debug('Delasport demo launch', { result });

  return result;
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  logger.debug('Delasport creditFreeSpins', { brandId, creditFreeSpinsRequest });

  const { player, bonusCode, id, spinCount } = creditFreeSpinsRequest;
  const { apiUrl, apiKey, apiAccess } = configuration;

  const url = `${apiUrl}/b2b/integration/marketing/activate-coupon`;
  const data = {
    "app-key": apiKey,
    "app-params": {
      "_user_id": getExternalPlayerId(player),
      "_code": bonusCode,
      "_activation_amount": spinCount,
    },
  };

  logger.debug('Delasport creditFreeSpins request', { url, data });
  const { data: result } = await axios.post(url, data, {
    headers: {
      'accept': 'application/json',
      'API-ACCESS': apiAccess,
      'Content-Type': 'application/json',
    },
  });

  logger.debug('Delasport creditFreeSpins response', bonusCode, id, player.username, result);

  if (result.error) {
    throw new Error(result.error);
  }
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
