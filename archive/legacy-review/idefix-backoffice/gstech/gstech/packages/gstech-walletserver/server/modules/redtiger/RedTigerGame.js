/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type { LaunchGameResponse } from './types';

const querystring = require('querystring');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { getJurisdiction } = require('../jurisdiction');

const configuration = config.providers.redtiger;

const returnGameScript = async (url: string) => {
  const result = {
    html: `<iframe allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${url}"></iframe>`,
    url,
  };
  return result;
};

const launchGame = async (player: Player, gameId: string, playerSessionId: string, lobbyUrl: string, depositUrl: string, isMobile: boolean): Promise<LaunchGameResponse> => {
  logger.debug('>>>>> RedTiger LAUNCHGAME', { player, gameId, playerSessionId, lobbyUrl, depositUrl, isMobile });
  const {countryId, languageId, brandId } = player;
  let casino
  // TODO: passing brandId doesn't work in production
  // Red Tiger free spins are always bound to certain brand, so without this parameter it won't work
  if (config.isProduction && getJurisdiction(player) === 'GNRS') casino = `${brandId}-de`;
  if (!config.isProduction) casino = `${brandId}${countryId === 'DE' ? '-de' : ''}`;
  const params = {
    token: playerSessionId,
    playMode: 'real',
    lang: languageId,
    lobbyUrl,
    channel: isMobile ? 'M' : 'D',
    casino,
    country: countryId,
    siteId: '',
    hasAutoplayTotalSpins: true,
    hasAutoplayLimitLoss: true,
    hasAutoplaySingleWinLimit: true,
    hasAutoplayStopOnJackpot: true,
    hasAutoplayStopOnBonus: true,
    fullScreen: false,
  };
  const url = `https://${configuration.gameServer}/luckydino/launcher/${gameId}?${querystring.stringify(params)}`;
  logger.debug('<<<<< RedTiger LAUNCHGAME', { url });
  return returnGameScript(url);
};

const launchDemoGame = async (
  gameId: string,
  lobbyUrl: string,
  langIso: string,
  currencyIso: string,
  isMobile: boolean,
): Promise<LaunchGameResponse> => {
  const params = {
    playMode: 'demo',
    lang: langIso,
    lobbyUrl,
    channel: isMobile ? 'M' : 'D',
    siteId: '',
    fullScreen: false,
  };
  const url = `https://${
    configuration.gameServer
  }/luckydino/launcher/${gameId}?${querystring.stringify(params)}`;
  logger.debug('>>>>> RedTiger DEMO', { url });
  return returnGameScript(url);
};

module.exports = { launchGame, launchDemoGame };
