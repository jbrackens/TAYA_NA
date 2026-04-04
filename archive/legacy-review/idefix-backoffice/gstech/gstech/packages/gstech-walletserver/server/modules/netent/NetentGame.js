/* @flow */
import type {
  GameLaunchOptions,
} from 'gstech-core/modules/clients/walletserver-api-types';

const logger = require('gstech-core/modules/logger');
const { getConfiguration } = require('./CasinoModule');

const createConfig = (
  brandId: BrandId,
  gameId: string,
  sessionId: string,
  languageId: string,
  currencyId: string,
  countryId: string,
  parameters: GameLaunchOptions,
  mobile: boolean,
) => {
  const options: any = parameters != null ? parameters.options || {} : {};
  logger.debug('launchGame', {
    brandId,
    gameId,
    sessionId,
    languageId,
    currencyId,
    countryId,
    parameters,
    options,
  });
  const conf = getConfiguration({ brandId, currencyId, countryId });

  if (options['netent-live'] === true) {
    if (options['netent-live-table'] != null) {
      const tableId = options['netent-live-table'];
      return {
        gameServer: conf.gameServer,
        staticServer: conf.staticServer,
        liveCasinoHost: conf.liveCasinoHost,
        casinoBrand: 'luckydino',
        gameId,
        tableId,
        sessionId,
        lobbyUrl:
          (parameters != null ? parameters.lobbyUrl : null) || conf.brands[brandId].lobbyUrl,
        targetElement: 'gameDiv',
        language: languageId,
        width: '100%',
        height: '100%',
        enforceRatio: false,
      };
    }

    return {
      staticServer: conf.staticServer,
      sessionId,
      language: languageId,
      lobbyUrl: (parameters != null ? parameters.lobbyUrl : null) || conf.brands[brandId].lobbyUrl,
      showMiniLobby: true,
      casinoBrand: 'luckydino',
      liveCasinoHost: conf.liveCasinoHost,
      targetElement: 'gameDiv',
      gameServer: conf.gameServer,
      gameId: mobile ? 'live-lobby_sw' : 'live-lobby_not_mobile_sw',
      width: '100%',
      height: '100%',
      enforceRatio: false,
    };
  }

  return {
    gameId,
    sessionId,
    staticServer: conf.staticServer,
    gameServer: conf.gameServer,
    targetElement: 'gameDiv',
    walletMode: 'seamlesswallet',
    applicationType: 'browser',
    launchType: parameters.forceIframe ? 'iframe' : undefined,
    language: languageId,
    width: '100%',
    height: '100%',
    enforceRatio: false,
    helpUrl: `${conf.gameServer}/game/gamerules.jsp?game=${gameId}&lang=${languageId}`,
    flashParams: {
      base: '.',
      wmode: 'window',
    },
    mobileParams: {
      lobbyUrl: (parameters != null ? parameters.lobbyUrl : null) || conf.brands[brandId].lobbyUrl,
    },
    ...conf.brands[brandId].config,
  };
};

const errors = {
  en: 'Browser is blocking Flash animations or Flash Player is not installed.',
  fi: 'Selain ei salli Flash-animaatioita tai Flash player ei ole asennettu',
  de: 'Der Browser blockiert die Flash Animation, oder der Flash Player ist nicht installiert',
  sv: 'Webbläsaren blockerar Flash animationer eller så är Flash Player inte installerat',
  no: 'Nettleseren blokkerer Flash animasjoner eller Flash Player er ikke installert',
};

const launchGame = (
  brandId: BrandId,
  gameId: string,
  sessionId: string,
  languageId: string,
  currencyId: string,
  countryId: string,
  parameters: GameLaunchOptions,
  mobile: boolean,
): { config: { ... }, html?: string, url?: string, parameters?: mixed } => {
  const conf = getConfiguration({ brandId, currencyId, countryId });
  logger.debug('launchGame netent', { brandId, currencyId, countryId }, conf);
  const config = createConfig(
    brandId,
    gameId,
    sessionId,
    languageId,
    currencyId,
    countryId,
    parameters,
    mobile,
  );
  return {
    config,
    html: `
    <div id='gameDiv'></div>
    <script type='text/javascript'>
      function getScript(url, callback) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = url;
        script.onload = callback;
        document.head.appendChild(script);
      }

      var startGame = function() {
        var config = ${JSON.stringify(config)};
        var success = function(netEntExtend) {
          if(window.console !== undefined && window.console.info !== undefined) {
            console.info('NETENT ok');
          }
        };
        var error = function(e) {
          if(window.console !== undefined && window.console.error !== undefined) {
            console.error('NETENT Error', e);
          }
          if(window.Bugsnag !== undefined) {
            window.Bugsnag.notifyException(e, 'NetEnt.error');
          }
          if(e.code === 13) {
            showErrorDialog('${
              // $FlowFixMe[invalid-computed-prop]
              errors[languageId] || errors.en
            }');
          }
        };
        netent.launch(config, success, error);
      };
      function initScript(src, callback) { if(window.netent) { callback(); } else { getScript(src, callback); }};
      initScript('${conf.gameinclusion}', function(data, textStatus, jqxhr) {
        startGame();
      });
    </script>`,
  };
};

const launchDemoGame = (
  brandId: BrandId,
  gameId: string,
  languageId: string,
  currencyId: string,
  parameters: GameLaunchOptions,
  mobile: boolean,
): { config: { ... }, html?: string, url?: string, parameters?: mixed } =>
  launchGame(
    brandId,
    gameId,
    `DEMO-${Date.now()}-${currencyId}`,
    languageId,
    currencyId,
    '',
    parameters,
    mobile,
  );

module.exports = { launchGame, launchDemoGame };
