/* @flow */
const _ = require('lodash');
const brandDefinition = require('gstech-core/modules/constants').brandDefinitions.OS;
const { parseCommChannelConfig } = require('gstech-core/modules/utils');
const config = require('../common/config');

const CDN = 'https://static.olaspill.com/';
const thumbsCDN = 'https://static.casinojefe.com/';
const productionMode = process.env.NODE_ENV === 'production';
const staging = process.env.CONFIGURATION === 'staging';

const stripSlashes = (site: string) => site.replace(/\/+$/, '');

const productionConfiguration = {
  baseUrl(rest: string = '') {
    return `https://olaspill.com${stripSlashes(rest)}`;
  },
  apiBaseUrl(rest: string = '') {
    return `https://os-api.luckydino.com${stripSlashes(rest)}`;
  },
  paymentiq: {
    merchantId: '100011004',
    apiUrl: 'https://api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://hostedpages.paymentiq.io/1.0.26/index.html',
  },

  clientConfig() {
    return {
      gaAccount: 'UA-85495409-1',
      gaDomain: 'olaspill.com',
      liveChat: true,
      gtm: 'GTM-W94JB8V',
      fbId: '812643355499161',
    };
  },
};

const developmentConfiguration = {
  baseUrl(rest: string) {
    return (process.env.URL || 'http://localhost:3000') + stripSlashes(rest);
  },
  apiBaseUrl(rest: string) {
    return (
      (process.env.PAYMENT_URL || process.env.URL || 'http://localhost:3000') + stripSlashes(rest)
    );
  },
  apiUrl() {
    return process.env.API_URL || 'http://localhost:3001/api/OS/v1/';
  },
  paymentiq: {
    merchantId: '100011999',
    apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://test-hostedpages.paymentiq.io/1.0.26/index.html',
  },
  clientConfig() {
    return {
      gaAccount: 'UA-61693500-1',
      gaDomain: 'none',
      liveChat: false,
    };
  },
};

const commonOptions = {
  liveAgent: {
    script: 'https://eeg.ladesk.com/scripts/track.js',
    id: 'la_x2s6df8d',
    loggedin: (language: string) =>
      // $FlowFixMe[invalid-computed-prop]
      ({ en: '7zbvpwbv' })[language] || '4bbpu53c',
    nonloggedin: (language: string) =>
      // $FlowFixMe[invalid-computed-prop]
      ({ en: '20aqbujz', })[language] || '3vy47e96',
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
    return config.cmsUrl || 'https://cms.olaspill.com/';
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
      NO: 'no',
    };
  },
  defaultBtag() {
    return '1000271_5C20962048EC11E6AC118FCF43F295C7';
  },
};

module.exports = (_.merge(
  commonOptions,
  productionMode && !staging ? productionConfiguration : developmentConfiguration,
): any);
