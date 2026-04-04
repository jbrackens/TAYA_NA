/* @flow */
const { stringify } = require('querystring');
const { encrypt } = require('gstech-core/modules/crypt');
const baseConfig = require('../../../config');
const { mapLanguageId, encryptionKey } = require('./constants');

const configuration = baseConfig.providers.williams;

const iframe = (src: string) => `<iframe allow=”autoplay" src="${src}" frameborder="0" allowtransparency="true" seamless="seamless"></iframe>`;

const createAccountRef = (brandId: string, playerId: Id) => `${brandId}_${playerId}`;

const createTicket = (accountRef: string, sessionId: string) => {
  const ticket = encrypt(encryptionKey + accountRef, sessionId);
  return ticket;
};

const launchDesktopDemoGame = (
  brandId: BrandId,
  gameCode: string,
  languageId: string,
  currency: string,
  parameters: any, // eslint-disable-line no-unused-vars
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  const config = {
    realMoney: false,
    locale: mapLanguageId(languageId),
    partnerCode: configuration.brands[brandId].partnerCode,
    currency,
    context: 'default',
    gameCode,
  };
  const html = iframe(`${configuration.flashUrl}?${stringify(config)}`);
  return { config: { url: configuration.flashUrl, config }, html };
};

const launchDesktopGame = (
  brandId: BrandId,
  gameCode: string,
  playerId: Id,
  sessionId: string,
  languageId: string,
  parameters: any,
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  const accountRef = createAccountRef(brandId, playerId);
  const config = {
    realMoney: true,
    locale: mapLanguageId(languageId),
    partnerCode: configuration.brands[brandId].partnerCode,
    gameCode,
    ticket: createTicket(accountRef, sessionId),
    accountId: accountRef,
    lobbyUrl: parameters.lobbyUrl || configuration.brands[brandId].lobbyUrl,
  };
  const html = iframe(`${configuration.flashUrl}?${stringify(config)}`);
  return { config: { url: configuration.flashUrl, config }, html };
};

const launchMobileDemoGame = (
  brandId: BrandId,
  game: string,
  languageId: string,
  currency: string,
  parameters: any,
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  const config = {
    realmoney: false,
    locale: mapLanguageId(languageId),
    partnercode: configuration.brands[brandId].partnerCode,
    currency,
    game,
    lobbyurl: parameters.lobbyUrl || configuration.brands[brandId].lobbyUrl,
  };
  const url = `${configuration.mobileUrl}?${stringify(config)}`;
  const html = iframe(url);
  return { url, config: { url: configuration.mobileUrl, config }, html };
};

const launchMobileGame = (
  brandId: BrandId,
  game: string,
  playerId: Id,
  sessionId: string,
  languageId: string,
  parameters: any,
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  const accountRef = createAccountRef(brandId, playerId);
  const config = {
    realmoney: true,
    locale: mapLanguageId(languageId),
    partnercode: configuration.brands[brandId].partnerCode,
    game,
    partnerticket: createTicket(accountRef, sessionId),
    partneraccountid: accountRef,
    lobbyurl: parameters.lobbyUrl || configuration.brands[brandId].lobbyUrl,
  };
  const url = `${configuration.mobileUrl}?${stringify(config)}`;
  const html = iframe(url);
  return { url, config: { url: configuration.mobileUrl, config }, html };
};

const launchGame = (
  brandId: BrandId,
  game: string,
  playerId: Id,
  sessionId: string,
  languageId: string,
  parameters: any,
  mobileGame: boolean,
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  if (parameters.mobile || mobileGame) {
    return launchMobileGame(brandId, game, playerId, sessionId, languageId, parameters);
  }
  return launchDesktopGame(brandId, game, playerId, sessionId, languageId, parameters);
};

const launchDemoGame = (
  brandId: BrandId,
  game: string,
  languageId: string,
  currency: string,
  parameters: any,
  mobileGame: boolean,
): { url?: string, html?: string, config: { url: string, config: mixed }, parameters?: mixed } => {
  if (parameters.mobile || mobileGame) {
    return launchMobileDemoGame(brandId, game, languageId, currency, parameters);
  }
  return launchDesktopDemoGame(brandId, game, languageId, currency, parameters);
};
module.exports = { launchGame, launchDemoGame };
