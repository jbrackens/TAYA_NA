/* @flow */
import type { Journey } from '../common/api';

const _ = require('lodash');
const brandDefinition = require('gstech-core/modules/constants').brandDefinitions.CJ;
const { parseCommChannelConfig } = require('gstech-core/modules/utils');
const config = require('../common/config');

const CDN = 'https://static.casinojefe.com/';
const thumbsCDN = 'https://static.casinojefe.com/';
const productionMode = process.env.NODE_ENV === 'production';
const staging = process.env.CONFIGURATION === 'staging';

const stripSlashes = (site: string) => site.replace(/\/+$/, '');

const productionConfiguration = {
  baseUrl(rest: string = '') {
    return `https://casinojefe.com${stripSlashes(rest)}`;
  },
  apiBaseUrl(rest: string = '') {
    return `https://cj-api.luckydino.com${rest}`;
  },

  paymentiq: {
    merchantId: '100011002',
    apiUrl: 'https://api.paymentiq.io/paymentiq/api',
    frameUrl: 'https://hostedpages.paymentiq.io/1.0.26/index.html',
  },

  clientConfig() {
    return {
      gaAccount: 'UA-61693500-1',
      gaDomain: 'casinojefe.com',
      liveChat: true,
      gtm: 'GTM-W68NKS',
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
    return process.env.API_URL || 'http://localhost:3001/api/CJ/v1/';
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
      trapErrors: false,
    };
  },
};

const commonOptions = {
  liveAgent: {
    script: 'https://eeg.ladesk.com/scripts/track.js',
    id: 'la_x2s6df8d',
    loggedin: (language: string) =>
      ({
        de: 'pq5m9nm5',
        fi: 'hr9xhgi6',
        no: 'we65rmee',
        // sv: 'y917k3h4',
        es: '', // TODO:
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || '9kyj3yex',
    nonloggedin: (language: string) =>
      ({
        de: 'd344ipye',
        fi: 'zntxrqa8',
        no: 'nw9yrpzf',
        // sv: 'r312iw53',
        es: '', // TODO:
        pt: '',
      // $FlowFixMe[invalid-computed-prop]
      })[language] || 'x4unj9rg',
  },
  paymentFees: {
    CreditCard_Bambora: {
      fee(journey: Journey) {
        if (!journey.balance?.VIPLevel || journey.balance?.VIPLevel < 8) {
          return 2.5;
        }
      },
    },
  },
  signUpVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.signUpVerificationChannel, req);
  },
  resetPasswdVerificationChannel(req?: express$Request) {
    return parseCommChannelConfig(config.resetPasswdVerificationChannel, req);
  },
  cms() {
    return config.cmsUrl || 'https://cms.casinojefe.com/';
  },
  productionMode() {
    return productionMode;
  },
  stagingMode() {
    return staging;
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
      banners: '1Mi59yoKWv19Be8UNiLudgt6fYYaxMNH34NJZGmPW38k',
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
      ES: 'es',
    };
  },
  defaultBtag() {
    return '1000271_39319E80A1D411E58CB2EB8061F740CE';
  },
};

module.exports = (_.merge(
  commonOptions,
  productionMode && !staging ? productionConfiguration : developmentConfiguration,
): any);
