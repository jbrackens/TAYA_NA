/* @flow */
const querystring = require('querystring');
const config = require('../../../config');

const configuration = config.providers.thunderkick;

const returnGameScript = async (url: string) => {
  const result = {
    html: `<iframe allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${url}"></iframe>`,
    url,
  };
  return result;
};

const launchGame = async (gameId: string, operatorId: number, playerSessionId: string, regulator: string, lobbyUrl: string, langIso: string, currencyIso: string, depositUrl: string, isMobile: boolean): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    device: isMobile ? 'mobile' : 'desktop',
    gameId,
    playMode: 'real',
    operatorId,
    playerSessionId,
    regulator,
    lobbyUrl,
    langIso,
    currencyIso,
    depositUrl,
  };
  const url = `https://${configuration.gameServer}/gamelauncher/play/generic?${querystring.stringify(params)}`;
  return returnGameScript(url);
};

const launchDemoGame = async (gameId: string, operatorId: number, regulator: string, lobbyUrl: string, langIso: string, currencyIso: string, isMobile: boolean): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    device: isMobile ? 'mobile' : 'desktop',
    gameId,
    playMode: 'demo',
    operatorId,
    regulator,
    lobbyUrl,
    langIso,
    freeAccountCurrencyIso: currencyIso,
  };

  const url = `https://${configuration.gameServer}/gamelauncher/play/generic?${querystring.stringify(params)}`;
  return returnGameScript(url);
};

module.exports = { launchGame, launchDemoGame };
