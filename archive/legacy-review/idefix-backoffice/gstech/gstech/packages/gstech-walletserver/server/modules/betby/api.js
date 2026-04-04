/* @flow */
import type {
  LaunchDemoGameRequest,
  RealGameLaunchInfo,
  LaunchGameRequest,
  CreditFreeSpinsRequest,
} from 'gstech-core/modules/clients/walletserver-api-types';

import type { GameProviderApi } from '../../types';

const { DateTime } = require('luxon');
// const { v1: uuid } = require('uuid');
const { axios } = require('gstech-core/modules/axios');
const jwt = require('jsonwebtoken');

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');

const configuration = config.providers.betby;

// eslint-disable-next-line no-unused-vars
const returnGameScript = (lang: string, brandId: string, themeName: string, sessionId: ?string) => {
  const result = {
    html: `<!doctype html>
         <html>
          <head>
          <meta name='viewport' content='width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1'/>
          <meta http-equiv='Content-Security-Policy' content="script-src 'self' 'unsafe-inline' https://*.sptpub.com/ https://ui.invisiblesport.com/  www.googletagmanager.com;"/>
          <style type='text/css'>
              html,body {
                margin: 0;
                padding: 0;
                height:100%;
                width:100%;
              }
              iframe {
                padding: 0;
                margin: 0;
                border: none;
              }
            </style>
          </head>
          <body>
          <script src='https://${configuration.rendererLib}/bt-renderer.min.js'></script>
          <div id='betby'></div>
          <script>
            (() => {
              const bt = new BTRenderer().initialize({
                brand_id: '${brandId}',
                key: '${sessionId || ''}',
                themeName: '${themeName}',
                lang: '${lang}',
                target: document.getElementById('betby'),
                betSlipOffsetTop: 0,
                betslipZIndex: 999,
                cssUrls: [
                  'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
                ],
                fontFamilies: ['Montserrat, sans-serif', 'Roboto, sans-serif'],
                onLogin: () => {
                  const event = new Event('onBetbyLogin');
                  document.dispatchEvent(event);
                },
                onRegister: () => {
                  const event = new Event('onBetbyRegister');
                  document.dispatchEvent(event);
                },
                onSessionRefresh: () => {
                  const event = new Event('onBetbySessionRefresh');
                  document.dispatchEvent(event);
                },
                onRecharge: () => {
                  const event = new Event('onBetbyRecharge');
                  document.dispatchEvent(event);
                },
                onBetSlipStateChange: () => {},
                onRouteChange: () => {},
              });

              window.addEventListener('hashchange', function () {
                const url = window.location.hash.split('=')[1];
                bt.updateOptions({ url });
              });
            })();
          </script>
          </body>
        </html>`,
  };
  return result;
};

// eslint-disable-next-line no-unused-vars
const launchGame = async (launchGameRequest: LaunchGameRequest): Promise<RealGameLaunchInfo> => {
  throw new Error('Game not implemented');
  // const result = {};
  // let sessionId;
  // if (launchGameRequest.sessions.length === 0) {
  //   sessionId = uuid();
  //   result.session = { sessionId };
  // } else {
  //   sessionId = launchGameRequest.sessions[0].sessionId;
  // }
  // const { player } = launchGameRequest;
  // const { brandId, themeName } = configuration.brands[player.brandId];

  // result.game = returnGameScript(player.languageId, brandId, themeName, sessionId);
  // logger.debug('Betby launch', { result });

  // return result;
};

// eslint-disable-next-line no-unused-vars
const launchDemoGame = async (brandId: BrandId, launchDemoGameRequest: LaunchDemoGameRequest): any => {
  throw new Error('Demo game not implemented');
  // const { languageId } = launchDemoGameRequest;
  // const { brandId: brand_id, themeName } = configuration.brands[brandId];

  // const result = {
  //   game: returnGameScript(languageId, brand_id, themeName, null),
  // };
  // logger.debug('Betby demo launch', { result });

  // return result;
};

// eslint-disable-next-line no-unused-vars
const creditFreeSpins = async (brandId: BrandId, creditFreeSpinsRequest: CreditFreeSpinsRequest): Promise<OkResult> => {
  logger.debug('creditFreeSpins', { brandId, creditFreeSpinsRequest });

  const { player, bonusCode, id } = creditFreeSpinsRequest;
  const [templateId, amount] = bonusCode.split(':');
  const {
    api: { host },
  } = configuration;
  const brand = configuration.brands[brandId].brandId;

  const url = `https://${host}/api/v1/external_api/bonus/mass_give_bonus`;
  const payload = {
    brand_id: brand,
    template_id: templateId,
    players_data: [
      {
        external_player_id: getExternalPlayerId(player),
        currency: player.currencyId,
        amount: Number(amount) * 100,
        force_activated: true,
      },
    ],
  };

  const now = DateTime.local().toSeconds();
  const body = {
    payload: jwt.sign(
      {
        iat: now,
        exp: now + 3600,
        jti: Math.random(),
        iss: configuration.operatorID,
        aud: brand,
        payload,
      },
      configuration.api.prvKey,
      { algorithm: 'RS256' },
    ),
  };

  logger.debug('Betby creditFreeSpins request', { url, payload, body });
  const { data: result } = await axios.request({
    method: 'POST',
    url,
    data: body,
    headers: {
      'X-BRAND-ID': brand,
    },
  });

  logger.debug('Betby creditFreeSpins response', bonusCode, id, player.username, result);
  return { ok: true };
};

const gameProvider: GameProviderApi = {
  launchDemoGame,
  launchGame,
  // creditFreeSpins,
};

module.exports = gameProvider;