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

const { DateTime } = require('luxon');
const querystring = require('querystring');
const moment = require('moment-timezone');
const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');

const { returnGameScript, getExternalPlayerId } = require('gstech-core/modules/helpers');
const { Money } = require('gstech-core/modules/money-class');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { getJurisdiction } = require('../jurisdiction');

const configuration = config.providers.nolimitcity;

const brandMapping = {
  CJ: 'CASINOJEFE',
  FK: 'HIPSPIN',
  KK: 'JUSTWOW',
  LD: 'LUCKYDINO',
  OS: 'OLASPILLL',
  SN: 'FRESHSPINS',
  VB: 'VIEBET',
};

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const { player, parameters, game } = launchGameRequest;
  const { brandId } = player;

  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const depositUrl = parameters && parameters.bankingUrl;

  const params = {
    token: sessionId,
    game: game.manufacturerGameId,
    operator: brandMapping[brandId],
    language: player.languageId,
    currency: player.currencyId,
    device: isMobile ? 'mobile' : 'desktop',
    lobbyUrl,
    depositUrl,
    jurisdiction: getJurisdiction(player) === 'GNRS' && encodeURIComponent(JSON.stringify({
      name: 'DE',
    })),
  };

  const url = `https://${configuration.gameServer}/loader/game-loader.html?${querystring.stringify(params)}`;
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

 
const launchDemoGame = async (brandId: string, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  const { parameters, game, languageId, currencyId } = launchDemoGameRequest;

  const isMobile = parameters != null && parameters.mobile;
  const lobbyUrl = parameters && parameters.lobbyUrl;
  const depositUrl = parameters && parameters.bankingUrl;

  const params = {
    game: game.manufacturerGameId,
    // $FlowFixMe[invalid-computed-prop]
    operator: brandMapping[brandId],
    language: languageId,
    currency: currencyId,
    device: isMobile ? 'mobile' : 'desktop',
    lobbyUrl,
    depositUrl,
  };

  const url = `https://${configuration.gameServer}/loader/game-loader.html?${querystring.stringify(params)}`;
  const result = {
    game: returnGameScript(url),
  };

  return result;
};

const creditFreeSpins = async (brandId: string, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<CreditFreeSpinsResponse> => {
  const { player, bonusCode, id } = creditFreeSpinsRequest;
  const [game, rounds, rawAmount] = bonusCode.split(':');
  const { apiServer, key } = configuration;
  const amount = new Money(rawAmount, 'EUR').asCurrency(player.currencyId).asFloat();

  const url = `https://${apiServer}/api/v1/json`;
  const body = {
    jsonrpc: '2.0',
    method: 'freebets.add',
    params: {
      identification: {
        // $FlowFixMe[invalid-computed-prop]
        name: brandMapping[brandId],
        key,
      },
      userId: getExternalPlayerId(player),
      promoName: `${id}_${player.id}`,
      game,
      rounds,
      amount: { amount, currency: player.currencyId },
      expires: DateTime.utc().plus({ weeks: 1 }),
    },
    id,
  };

  logger.debug('nolimitcity creditFreeSpins request', { url, body });
  const { data: result } = await axios.request({ method: 'POST', url, data: body });

  if (result.error) {
    logger.error('nolimitcity creditFreeSpins error', { bonusCode, id, player: player.username, result });
    return { ok: false };
  }

  logger.debug('nolimitcity creditFreeSpins response', { bonusCode, id, player: player.username, result });
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  creditFreeSpins,
};

module.exports = gameProvider;
