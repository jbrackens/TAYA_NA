/* @flow */
const _ = require('lodash');
const brandDefinition = require('gstech-core/modules/constants').brandDefinitions.VB;
const { parseCommChannelConfig } = require('gstech-core/modules/utils');
const config = require('../common/config');

const CDN = 'https://static.vie.bet/';
const thumbsCDN = 'https://static.casinojefe.com/';
const bonusThumbsCDN = 'https://static.luckydino.com/';
const productionMode = process.env.NODE_ENV === 'production';
const staging = process.env.CONFIGURATION === 'staging';

const stripSlashes = (site: string) => site.replace(/\/+$/, '');

const productionConfiguration = {
  baseUrl(rest: string = '') {
    return `https://vie.bet${stripSlashes(rest)}`;
  },
  apiBaseUrl(rest: string = '') {
    return `https://vb-api.luckydino.com${rest}`;
  },
  paymentiq: {
    merchantId: '100011005',
    apiUrl: 'https://api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://hostedpages.paymentiq.io/1.0.26/index.html',
  },

  clientConfig() {
    return {
      gaAccount: 'UA-78963193-12',
      gaDomain: 'vie.bet',
      liveChat: true,
      gtm: 'GTM-MNF8KSF',
      fbId: '812643355499161',
    };
  },
};

const developmentConfiguration = {
  baseUrl(rest: string = '') {
    return (process.env.URL || 'http://localhost:3000') + stripSlashes(rest);
  },
  apiBaseUrl(rest: string = '') {
    return (process.env.PAYMENT_URL || process.env.URL || 'http://localhost:3000') + rest;
  },
  apiUrl() {
    return process.env.API_URL || 'http://localhost:3001/api/VB/v1/';
  },
  clientConfig() {
    return {
      gaAccount: 'UA-61693500-1',
      gaDomain: 'none',
      liveChat: true,
    };
  },
  paymentiq: {
    merchantId: '100011999',
    apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://test-hostedpages.paymentiq.io/1.0.26/index.html',
  },
};

const commonOptions = {
  liveAgent: {
    script: 'https://eeg.ladesk.com/scripts/track.js',
    id: 'la_x2s6df8d',
    loggedin: (language: string) =>
      ({
        en: '5cwbo555',
        es: 'f637gon5',
        fi: 'wv3e6pgt',
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || '5cwbo555',
    nonloggedin: (language: string) =>
      ({
        en: '5cwbo555',
        es: 'f637gon5',
        fi: 'wv3e6pgt',
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || '5cwbo555',
  },
  paymentFees: {},
  signUpVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.signUpVerificationChannel, req);
  },
  resetPasswdVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.resetPasswdVerificationChannel, req);
  },
  productionMode() {
    return productionMode;
  },
  stagingMode() {
    return staging;
  },
  cms() {
    return config.cmsUrl || 'https://cms.vie.bet/';
  },
  shortBrandId() {
    return brandDefinition.id;
  },
  cdnBase() {
    return CDN;
  },
  thumbsCdnBase() {
    return thumbsCDN;
  },
  bonusThumbsCdnBase() {
    return bonusThumbsCDN;
  },
  cdn(path: string) {
    return `${CDN}${path}`;
  },
  requireActivationPath() {
    return '/loggedin/myaccount/inbox/3/';
  },
  apiUrl() {
    return process.env.API_URL;
  },
  apiKey() {
    return config.api.backend.staticTokens[brandDefinition.id];
  },
  sheets() {
    return {
      localizations: '1b6XpHDqJX8l17YVCPEFYBdDDi-ZsWL4sPaRXvMiarIQ',
    };
  },
  languages() {
    return config.languages[brandDefinition.id];
  },
  countryMappings() {
    return {
      FI: 'en',
      ES: 'es',
      PT: 'pt',
    };
  },
  defaultBtag() {
    return '1000271_5C20962048EC11E6AC118FCF43F295C7';
  },
  currentTcVersion: 16,
  newUserTcVersion: 16,
};

module.exports = (_.merge(
  commonOptions,
  productionMode && !staging ? productionConfiguration : developmentConfiguration,
): any);
