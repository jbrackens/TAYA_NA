/* @flow */
import type { Player } from 'gstech-core/modules/types/player';

const querystring = require('querystring');
const config = require('../../../config');
const { getJurisdiction } = require('../jurisdiction');

const configuration = config.providers.pragmatic;

const gameUrl = (domain: string, token: string, symbol: string, technology: string, platform: string, language: string, cashierUrl: string, lobbyURL: string, secureLogin: string) => {
  const key = encodeURIComponent([`token=${token}`, `&symbol=${symbol}`, `&technology=${technology}`, `&platform=${platform}`, `&language=${language}`, `&cashierUrl=${cashierUrl}`, `&lobbyUrl=${lobbyURL}`].join(''));
  if (secureLogin) {
    return [`https://${domain}`, `/gs2c/playGame.do?key=${key}&stylename=${secureLogin}`].join('');
  }
  return [`https://${domain}`, `/gs2c/playGame.do?key=${key}`].join('');
};

const returnGameScript = async (brandId: BrandId, params: any) => {
  const url = gameUrl(configuration.gameServer, params.token, params.symbol, params.technology, params.platform, params.language, params.cashierUrl, params.lobbyUrl, params.secureLogin);
  const result = {
    html: `
    <div>
      <iframe allow="autoplay" id="ppGameDiv" frameborder="0" seamless="seamless" allowtransparency="true"></iframe>
      <script>
        function getScript(url, callback) {
          const script = document.createElement("script");
          script.type = "text/javascript";
          script.src = url;
          script.onload = callback;
          document.head.appendChild(script);
        }
        getScript('https://${configuration.gameServer}/gs2c/common/js/lobby/GameLib.js',
          function() {
            const launchurl = GameLib.gameUrl(
              '${configuration.gameServer}',
              '${params.token}',
              '${params.symbol}',
              '${params.technology}',
              '${params.platform}',
              '${params.language}',
              '${params.cashierUrl}',
              '${params.lobbyUrl}',
              '${params.secureLogin}'
            );
            const ppGameDiv = document.getElementById("ppGameDiv");
            ppGameDiv.src = launchurl;
          }
        );
      </script>
    </div>`,
    url,
  };
  return result;
};

const returnDemoGameScript = async (brandId: BrandId, url: string) => {
  const result = {
    html: `<iframe allow="autoplay" frameborder="0" allowtransparency="true" seamless="seamless" src="${url}"></iframe>`,
    url,
  };
  return result;
};

const launchGame = async (player: Player, game: string, sessionId: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const {brandId, languageId, countryId } = player;
  const brandConfig = getJurisdiction(player) === 'GNRS' ? configuration.germanBrands[brandId] : configuration.brands[brandId];
  if (!brandConfig) {
    throw new Error(`Pragmatic games are no configured for brand ${brandId} in ${countryId}`);
  }

  const params = {
    technology: 'H5',
    platform: parameters.mobile ? 'MOBILE' : 'WEB',
    symbol: game,
    language: languageId,
    token: sessionId,
    cashierUrl: (parameters != null ? parameters.bankingUrl : null),
    lobbyUrl: (parameters != null ? parameters.lobbyUrl : null),
    practice: 0,
    secureLogin: brandConfig.secureLogin,
  };
  return returnGameScript(brandId, params);
};

const launchDemoGame = async (brandId: BrandId, game: string, languageId: string, currency: string, parameters: any): Promise<{html?: string, parameters?: mixed, url?: string}> => {
  const params = {
    gameSymbol: game,
    lang: languageId,
    cur: currency,
    lobbyUrl: (parameters != null ? parameters.lobbyUrl : null),
  };
  const url = `${configuration.brands[brandId].demoLaunchUrl}?${querystring.stringify(params)}`;
  return returnDemoGameScript(brandId, url);
};

module.exports = { launchGame, launchDemoGame };
