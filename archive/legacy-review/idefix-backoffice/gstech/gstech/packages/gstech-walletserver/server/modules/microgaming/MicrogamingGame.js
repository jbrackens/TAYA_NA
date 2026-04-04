/* @flow */
import type { Player } from 'gstech-core/modules/types/player';
import type {
  MicrogamingConfig,
  ExtendedConfig,
} from "../../types";

const { stringify } = require('querystring');
const { v1: uuid } = require('uuid');
const first = require('lodash/fp/first');
const config = require('../../../config');
const configuration = require('../../../config').providers.microgaming;

const getConf = (): ExtendedConfig<MicrogamingConfig> => first(configuration);

const launchGame = async (player: Player, game: string, sessionId: string, parameters: any, mobileGame: boolean): Promise<{ url?: string, parameters?: mixed, html?: string }> => {
  const authToken = sessionId;
  const conf = getConf();
  const { brandId, languageId } = player;
  const lobbyUrl = { finalUrl: (parameters != null ? parameters.lobbyUrl : null) || conf.brands[brandId].lobbyUrl };
  const bankingURL = { finalUrl: (parameters != null ? parameters.bankingUrl : null) || conf.brands[brandId].bankingUrl };

  if (mobileGame) {
    const params = {
      casinoID: conf.brands[brandId].serverId,
      lobbyURL: `${config.api.walletServer.public}/microgaming/redirect?${stringify(lobbyUrl)}`,
      bankingURL: `${config.api.walletServer.public}/microgaming/redirect?${stringify(bankingURL)}`,
      loginType: 'VanguardSessionToken',
      authToken,
      isRGI: true,
    };
    const url = `${conf.mobileLaunchUrl + [conf.brands[brandId].lobbyName, game, languageId].join('/')}?${stringify(params)}`;
    return {
      parameters: params,
      url,
    };
  }
  const params = {
    applicationid: conf.brands[brandId].applicationid,
    serverid: conf.brands[brandId].serverId,
    gameid: game,
    authtoken: authToken,
    ul: languageId,
    variant: conf.variant,
  };
  const url = `${conf.launchUrl}?${stringify(params)}`;
  const html = `<iframe allow="autoplay" name="game-frame" style="width: 100%; height: 100%; border: 0; margin: 0;" src="${url}" frameborder="0" allowtransparency="true" seamless="seamless"></iframe>`;
  return {
    parameters: params,
    html,
  };
};

const launchDemoGame = async (brandId: BrandId, game: string, languageId: string, currency: string, parameters: any, mobileGame: boolean): Promise<{ url?: string, parameters?: mixed, html?: string }>=> {
  const conf = getConf();

  const authToken = uuid();
  if (mobileGame) {
    const lobbyUrl = { finalUrl: (parameters != null ? parameters.lobbyUrl : null) || conf.brands[brandId].lobbyUrl };
    const params = {
      casinoID: conf.demoServerId,
      lobbyURL: `${config.api.walletServer.public}/microgaming/redirect?${stringify(lobbyUrl)}`,
      gameid: game,
      authToken,
      isRGI: true,
      loginType: 'VanguardSessionToken',
    };
    const url = `${conf.mobileLaunchUrl + [conf.brands[brandId].lobbyName, game, languageId].join('/')}?${stringify(params)}`;
    return {
      parameters: params,
      url,
    };
  }
  const params = {
    applicationid: conf.brands[brandId].applicationid,
    sext1: 'demo',
    sext2: 'demo',
    serverid: conf.demoServerId,
    gameid: game,
    ul: '',
    variant: conf.demoVariant,
  };
  const url = `${conf.launchUrl}?${stringify(params)}`;
  const html = `<iframe allow="autoplay" name="game-frame" style="border: 0; margin: 0; width: 100%; height: 100%;" src="${url}" frameborder="0" allowtransparency="true" seamless="seamless"></iframe>`;
  return {
    parameters: params,
    html,
  };
};

module.exports = { launchGame, launchDemoGame, getConf };
