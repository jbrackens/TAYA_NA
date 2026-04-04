/* @flow */
const querystring = require('querystring');
const config = require('../../../config');

const configuration = config.providers.lottowarehouse;

const returnGameScript = async (url: string) => {
  const result = {
    html: `<iframe frameborder="0" allowtransparency="true" allow=”autoplay" seamless="seamless" allowfullscreen scrolling="no" style="margin: 0; padding: 0; white-space: nowrap; border: 0;" src="${url}"></iframe>`,
    url,
  };
  return result;
};

const launchGame = async (gameId: string, sessionId: string, isMobile: boolean, lobbyUrl: string): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    gameId,
    sessionId,
    isMobile,
    lobbyUrl,
  };
  const url = `https://${configuration.gameServer}/?${querystring.stringify(params)}`;
  return returnGameScript(url);
};

module.exports = { launchGame };
