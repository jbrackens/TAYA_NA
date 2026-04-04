/* @flow */
const querystring = require('querystring');
const config = require('../../../config');

const configuration = config.providers.yggdrasil;

const defaultConfiguration = configuration.environments[0];

const returnGameScript = async (brandId: BrandId, url: string) => {
  const result = {
    html: `<iframe frameborder="0" allowtransparency="true" allow="autoplay" seamless="seamless" src="${url}"/>`,
    url,
  };
  return result;
};

const launchGame = async (brandId: BrandId, game: string, sessionId: string, languageId: string, currency: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    gameid: game,
    lang: languageId,
    currency,
    org: configuration.brands[brandId].org,
    channel: parameters.mobile ? 'mobile' : 'pc',
    key: sessionId,
    license: 'mt',
  };
  const url = `${defaultConfiguration.launchUrl}?${querystring.stringify(params)}`;
  return returnGameScript(brandId, url);
};

const launchDemoGame = async (brandId: BrandId, game: string, languageId: string, currency: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string,}> => {
  const params = {
    gameid: game,
    lang: languageId,
    currency,
    org: 'Demo',
    channel: parameters.mobile ? 'mobile' : 'pc',
    share: 'no',
    key: '',
    license: 'mt',
  };
  const url = `${defaultConfiguration.demoLaunchUrl}?${querystring.stringify(params)}`;
  return returnGameScript(brandId, url);
};

module.exports = { launchGame, launchDemoGame };
