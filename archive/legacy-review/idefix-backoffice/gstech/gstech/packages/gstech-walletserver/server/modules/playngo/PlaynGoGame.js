/* @flow */
import type {
  GameLaunchOptions,
} from 'gstech-core/modules/clients/walletserver-api-types';
import type { PlayngoEnvironment } from '../../types';

const querystring = require('querystring');
const logger = require('gstech-core/modules/logger');
const { mapLanguageId } = require('./constants');

const launchDesktopGame = (brandId: string, url: string): {html?: string, parameters?: mixed, script: string, url?: string,} => {
  const result = {
    html: `
      <iframe scrolling="no" noresize="noresize" allow=”autoplay" name="game-frame" src="${url}" frameborder="0" allowtransparency="true" seamless="seamless"></iframe>`,
    url,
    script: url.replace('pngCasinoGame', 'pngDummyContainer'),
  };
  return result;
};

const launchGame = async (conf: PlayngoEnvironment, brandId: string, countryId: string, game: string, sessionId: string, languageId: string, parameters: GameLaunchOptions, mobileGame: boolean): Promise<{html?: string, parameters?: mixed, script: string, url?: string,}> => {
  const params = {
    div: 'pngCasinoGame',
    lang: mapLanguageId(languageId),
    pid: conf.pid,
    gameid: game,
    ticket: sessionId,
    practice: 0,
    brand: brandId,
    embedmode: 'iframe',
    channel: mobileGame ? 'mobile' : 'desktop',
    origin: parameters.lobbyUrl,
    country: countryId,
  };
  const url = `${conf.desktopLaunch}?${querystring.stringify(params)}`;
  logger.debug('PlaynGo game launch url', url);
  return launchDesktopGame(brandId, url);
};

const launchDemoGame = async (conf: PlayngoEnvironment, brandId: string, game: string, languageId: string, currency: string, parameters: GameLaunchOptions, mobileGame: boolean): Promise<{html?: string, parameters?: mixed, script: string, url?: string, }> => {
  const params = {
    div: 'pngCasinoGame',
    lang: mapLanguageId(languageId),
    pid: conf.pid,
    gameid: game,
    practice: 1,
    embedmode: 'iframe',
    channel: mobileGame ? 'mobile' : 'desktop',
    origin: parameters.lobbyUrl,
  };
  const url = `${conf.desktopLaunch}?${querystring.stringify(params)}`;
  logger.debug('PlaynGo demo game launch url', url);
  return launchDesktopGame(brandId, url);
};

module.exports = { launchGame, launchDemoGame };
