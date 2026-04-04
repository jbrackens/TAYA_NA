/* @flow */
const querystring = require('querystring');
const config = require('../../../config');

const configuration = config.providers.habanero;

const returnGameScript = async (brandId: string, url: string) => {
  const result = {
    html: `<iframe frameborder="0" allowtransparency="true" allow=”autoplay" seamless="seamless" allowfullscreen scrolling="no" style="margin: 0; padding: 0; white-space: nowrap; border: 0;" src="${url}"/>`,
    url,
  };
  return result;
};

const launchGame = async (brandId: string, game: string, sessionId: string, languageId: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    brandid: configuration.brandId,
    keyname: game,
    token: sessionId,
    mode: 'real',
    locale: languageId,
    ifrm: parameters.mobile ? '0' : '1',
    // $FlowFixMe[invalid-computed-prop]
    lobbyurl: (parameters != null ? parameters.lobbyUrl : null) || configuration[brandId].lobbyUrl,
  };
  const url = `${configuration.gameLaunchUrl}?${querystring.stringify(params)}`;
  return returnGameScript(brandId, url);
};

const launchDemoGame = async (brandId: string, game: string, languageId: string, currency: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    brandid: configuration.brandId,
    keyname: game,
    mode: 'fun',
    locale: languageId,
    ifrm: parameters.mobile ? '0' : '1',
    // $FlowFixMe[invalid-computed-prop]
    lobbyurl: (parameters != null ? parameters.lobbyUrl : null) || configuration[brandId].lobbyUrl,
  };
  const url = `${configuration.gameLaunchUrl}?${querystring.stringify(params)}`;
  return returnGameScript(brandId, url);
};

module.exports = { launchGame, launchDemoGame };
