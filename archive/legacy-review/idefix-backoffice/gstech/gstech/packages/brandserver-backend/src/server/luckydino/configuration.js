/* @flow */
const _ = require('lodash');
const brandDefinition = require('gstech-core/modules/constants').brandDefinitions.LD;
const { parseCommChannelConfig } = require('gstech-core/modules/utils');
const config = require('../common/config');

const thumbsCDN = 'https://static.luckydino.com/';
const CDN = 'https://static.luckydino.com/';
const productionMode = process.env.NODE_ENV === 'production';
const staging = process.env.CONFIGURATION === 'staging';

const stripSlashes = (site: string) => site.replace(/\/+$/, '');

const productionConfiguration = {
  baseUrl(rest: string = '') {
    return `https://luckydino.com${stripSlashes(rest)}`;
  },
  apiBaseUrl(rest: string = '') {
    return `https://api.luckydino.com${rest}`;
  },

  paymentiq: {
    merchantId: '100011001',
    apiUrl: 'https://api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://hostedpages.paymentiq.io/1.0.26/index.html',
  },

  clientConfig() {
    return {
      gaAccount: 'UA-47088140-1',
      gaDomain: 'luckydino.com',
      liveChat: true,
      gtm: 'GTM-MLBJTF',
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
    return process.env.API_URL || 'http://localhost:3001/api/LD/v1/';
  },
  paymentiq: {
    merchantId: '100011999',
    apiUrl: 'https://test-api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://test-hostedpages.paymentiq.io/1.0.26/index.html',
  },

  clientConfig() {
    return {
      gaAccount: 'UA-47088140-2',
      gaDomain: 'none',
      liveChat: false,
      gtm: 'GTM-NQJ7C8',
    };
  },
};

const commonOptions = {
  liveAgent: {
    script: 'https://eeg.ladesk.com/scripts/track.js',
    id: 'la_x2s6df8d',
    loggedin: (language: string) =>
      ({
        de: 'jg7n86mt',
        fi: 'm9f3um0n',
        no: '5ji8skr3',
        // sv: 'w7oo3a7o',
        fr: '220pj0vz',
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || 'tuvp7bu9',
    nonloggedin: (language: string) =>
      ({
        de: 'kmq2dp8v',
        fi: 'crkefif7',
        no: 'or1mazb1',
        // sv: 'cj03zxnv',
        fr: 'gnhx910a',
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || 'fnpsvd52',
  },
  paymentFees: {},
  signUpVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.signUpVerificationChannel, req);
  },
  resetPasswdVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.resetPasswdVerificationChannel, req);
  },
  cms() {
    return config.cmsUrl || 'https://cms.luckydino.com/';
  },
  productionMode() {
    return productionMode;
  },
  stagingMode() {
    return staging;
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
  shortBrandId() {
    return brandDefinition.id;
  },
  apiUrl() {
    return process.env.API_URL;
  },
  apiKey() {
    return config.api.backend.staticTokens[brandDefinition.id];
  },
  requireActivationPath() {
    return '/loggedin/myaccount/inbox/10/';
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
      FI: 'fi',
      SE: 'sv',
      DE: 'de',
      NO: 'no',
      FR: 'fr',
    };
  },
  defaultBtag() {
    return '1000271_FF485510A1D311E598BFE9B3154BA840';
  },
};

module.exports = (_.merge(
  commonOptions,
  productionMode && !staging ? productionConfiguration : developmentConfiguration,
): any);
