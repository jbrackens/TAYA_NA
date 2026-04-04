/* @flow */
import type {
  GetJackpotsRequest,
  CreditFreeSpinsRequest,
  LaunchDemoGameRequest,
  LaunchGameRequest,
  RealGameLaunchInfo,
  DemoGameLaunchInfo,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { GameProviderApi } from '../../types';

const { axios } = require('gstech-core/modules/axios');
const { v1: uuid } = require('uuid');
const _ = require('lodash');
const crypto = require('crypto');

const logger = require('gstech-core/modules/logger');
const RedTigerGame = require('./RedTigerGame');
const config = require('../../../config');

const configuration = config.providers.redtiger;

const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  logger.debug('>>> RedTiger LAUNCHGAME', { launchGameRequest });
  const isMobile = launchGameRequest.parameters != null && launchGameRequest.parameters.mobile;
  const newSession = launchGameRequest.sessions.length === 0;
  const sessionId = newSession ? uuid() : launchGameRequest.sessions[0].sessionId;

  const result = {
    ...(newSession ? { session: { sessionId } } : {}),
    game: await RedTigerGame.launchGame(
      launchGameRequest.player,
      launchGameRequest.game.manufacturerGameId,
      sessionId,
      launchGameRequest.parameters != null ? launchGameRequest.parameters.lobbyUrl : '',
      launchGameRequest.parameters != null ? launchGameRequest.parameters.bankingUrl : '',
      isMobile,
    ),
  };
  logger.debug('<<< RedTiger LAUNCHGAME', { result });
  return result;
};

const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): Promise<DemoGameLaunchInfo> => {
  logger.debug('>>> RedTiger DEMO', { launchDemoGameRequest });
  const isMobile = launchDemoGameRequest.parameters != null && launchDemoGameRequest.parameters.mobile;
  const g = await RedTigerGame.launchDemoGame(launchDemoGameRequest.game.manufacturerGameId, launchDemoGameRequest.parameters != null ? launchDemoGameRequest.parameters.lobbyUrl : '', launchDemoGameRequest.languageId, launchDemoGameRequest.currencyId, isMobile);
  logger.debug('<<< RedTiger DEMO ', { g });
  return { game: g };
};

const getJackpots = async (brandId: BrandId, getJackpotsRequest: GetJackpotsRequest): any => {
  logger.debug('>>> RedTiger GETJACKPOTS', { getJackpotsRequest });
  const rawResult = [];
  for (const currency of getJackpotsRequest.currencies) {
    const uri = `https://${configuration.apiServer}/jackpots?currency=${currency}`;
    try {
      logger.debug('>>>>> RedTiger GETJACKPOTS', { uri });
      const { data: response } = await axios.request({ url: uri });
      logger.debug('<<<<< RedTiger GETJACKPOTS', { response });

      if (response.error) {
        logger.warn('failed to get red tiger jackpots', response.error);
        // eslint-disable-next-line no-continue
        continue;
      }

      const subJackpots = response.result.jackpots.map((jackpot) => {
        const pot = jackpot.pots.find(p => p.name === 'Progressive');
        if (!pot) return [];

        const jackpots = getJackpotsRequest.games.map((game) => {
          if (jackpot.games.includes(game.manufacturerGameId)) {
            return {
              game: game.gameId,
              amount: pot.amount,
              currency: pot.currency,
            };
          }
          return {};
        });
        return jackpots.filter(j => Object.entries(j).length !== 0);
      });
      rawResult.push(_.flatten<{...}, any>(subJackpots));
    } catch (e) {
      logger.warn('failed to get red tiger jackpots', e);
      // eslint-disable-next-line no-continue
      continue;
    }
  }

  const flatten = _.values(_.groupBy(_.flatten(rawResult.filter(a => a.length > 0)), 'game'));
  const result = flatten.map(item => ({
    game: item[0].game,
    currencies: item.map(details => ({
      amount: details.amount,
      currency: details.currency,
    })),
  }));
  logger.debug('<<< RedTiger GETJACKPOTS', { getJackpotsRequest });
  return result;
};

const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<OkResult> => { // eslint-disable-line no-unused-vars
  logger.debug('>>> RedTiger CREDITFREESPINS', { creditFreeSpinsRequest });
  const { player, bonusCode, id } = creditFreeSpinsRequest;

  if (Number.isInteger(bonusCode)) throw new Error(`bonusCode: '${bonusCode}' must be a number (campaignId)`);

  const url = `https://${configuration.gameServer}/luckydino/api/bonuses/offer`;
  const body = {
    campaignId: Number(bonusCode),
    userId: `${player.brandId}_${player.id}`,
    currency: player.currencyId,
    instanceCode: id,
    casino: `${player.brandId}_`,
  };

  const strg = `${JSON.stringify(body)}${configuration.bonusApi.secret}`;
  const hash = crypto.createHash('md5').update(strg).digest('hex');

  try {
    const { data: response } = await axios.request({
      url,
      data: body,
      headers: {
        key: configuration.bonusApi.key,
        hash,
      },
    });

    logger.debug('<<< RedTiger CREDITFREESPINS', { response });
    return { ok: true };
  } catch (e) {
    logger.error('XXX RedTiger CREDITFREESPINS', { error: e.error });
    return { ok: false };
  }
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  getJackpots,
  // TODO: red tiger free spins do not work as we expect. They credit those to all the players in a one shot. Disabling those to avoid any accidental credit
  // creditFreeSpins,
};

module.exports = gameProvider;
