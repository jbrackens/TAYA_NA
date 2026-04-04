/* @flow */
import type { RequestContext, Player, LangDef } from './api';

const { guard } = require('gstech-core/modules/utils');
const cldr = require('twitter_cldr');
const crypto = require('crypto');
const MobileDetect = require('mobile-detect');
const _ = require('lodash');
const { marked } = require('marked');
const { gfmHeadingId } = require('marked-gfm-heading-id');
const languageParser = require('accept-language-parser');
const moment = require('moment-timezone');
const configuration = require('./configuration');
const logger = require('./logger');

const renderer = new marked.Renderer();
const linkTemplate = _.template('<a href="<%- link %>" class="<%- key %>"><%- value %></a>');
const newWindowLinkTemplate = _.template('<a href="<%- link %>" target="_blank" class="<%- key %>"><%- value %></a>');
const currencyVars = configuration.requireProjectFile('./data/currency-vars.json');
const countries = configuration.requireProjectFile('./data/countries');

const defaultCurrency = _.first(_.keys<string>(currencyVars));

const urlRE = /^https?:/;

renderer.link = (href, title, text) => `<a href="${href}" target="_blank" rel="nofollow">${text}</a>`;
renderer.image = (href, title) => {
  const img = urlRE.test(href) ? href : configuration.cdn(href);
  return `<img src="${img}" alt="${title}" />`;
};
marked.setOptions({ breaks: true, renderer });
marked.use(gfmHeadingId());

const getRemoteAddress = (req: express$Request, ipv6: boolean = true): IPAddress => {
  const { headers } = req;
  if (headers != null) {
    let addr = headers['cf-connecting-ipv6'];
    if (ipv6 && addr != null) {
      return addr;
    }

    addr = headers['cf-connecting-ip'];
    if (addr != null) {
      return addr;
    }

    addr = headers['x-client-ip'];
    if (addr != null) {
      return addr;
    }

    addr = headers['x-forwarded-for'];
    if (addr != null) {
      return _.last(addr.split(','))
        .trim()
        .replace('::ffff:', '');
    }
  }
  if (req.connection != null && !configuration.productionMode()) {
    // This shoould be used only in development environment
    if (req.connection.remoteAddress === '::1') {
      return '127.0.0.1';
    }
    return ((req.connection.remoteAddress: any): string).replace('::ffff:', '');
  }
  return '';
};

const countryForISO = (countryISO: ?string): any | {CountryISO: string, CountryName: string, CurrencyISO: string} => {
  if (countryISO == null || countryISO === '--' || countryISO === '' || countryISO == null) {
    return { CurrencyISO: defaultCurrency, CountryISO: '', CountryName: '-' };
  }
  const c = _.find(countries, x => x.CountryISO === countryISO);
  if (c != null) {
    return c;
  }
  return { CurrencyISO: defaultCurrency, CountryISO: countryISO, CountryName: '-' };
};

const country = (req: express$Request): any | {CountryISO: string, CountryName: string, CurrencyISO: string} => {
  if (req.headers['cf-ipcountry'] != null) {
    return countryForISO(req.headers['cf-ipcountry']);
  }
  return {
    CurrencyISO: defaultCurrency,
    CountryISO: '',
    CountryName: '-',
  };
};

const money = (lang: LangDef): ((amount: number, currency: string, decimals?: boolean) => string) => (amount: number, currency: string, decimals: boolean = true) => {
  if (amount != null && currency != null && !isNaN(amount)) {
    if (!lang.code) {
      throw new Error(`Invalid language: ${JSON.stringify(lang)}`);
    }
    const TwitterCldr = cldr.load(lang.code === 'no' ? 'fi' : lang.code);
    const fmt = new TwitterCldr.CurrencyFormatter();
    const precision = decimals ? fmt.default_precision : 0;
    return (amount < 0 ? '-' : '') + fmt.format(Math.abs(amount), { currency, precision });
  }
  logger.warn('Unable to format money', { lang, amount, currency, decimals });
  return '';
};

const formatMoney = (req: express$Request, amount: number, decimals: boolean = true): string =>
  money({ code: req.context.languageISO })(amount, req.context.currencyISO, decimals);

const formatDate = (req: express$Request, date: Date): any =>
  moment
    .tz(date, 'Europe/Malta')
    .locale(req.context.languageISO)
    .format('l');

const pluckAll = (source: any, ...args: string[]): any => {
  const result: any = {};
  for (const key of Array.from(args)) {
    result[key] = source[key] != null ? source[key] : '';
  }
  return result;
};

const pluckAllIfExists = (source: any, ...args: string[]): any => {
  const result: any = {};
  for (const key of Array.from(args)) {
    if ((source != null ? source[key] : undefined) != null && source[key] !== '') {
      result[key] = source[key];
    }
  }
  return result;
};

const nl2br = (str: string, is_xhtml: boolean = true): string => {
  const breakTag = is_xhtml ? '<br />' : '<br>';
  return (`${str}`).replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, `$1${breakTag}$2`);
};

const populate = (
  text: string,
  values: any = {},
  html: boolean | 'markdown' = false,
  options: any = { linkTemplate },
  outputKeys: boolean = false,
  customRenderer: any = null,
): any | string => {
  const result = (text || '').replace(/\{(\w.*?)\}/g, (lookup) => {
    const key = lookup.replace(/[\{\}]/g, '');
    const keysc = key.split(':');
    const keys = key.split('|');
    const r = (() => {
      if (!outputKeys && keys.length === 2) {
        if (html) {
          if (options.newWindow)
            return (options.linkTemplate || newWindowLinkTemplate)({
              link: values != null ? values[keys[0]] : undefined,
              key: keys[0],
              value: keys[1],
            });
          return (options.linkTemplate || linkTemplate)({
            link: values != null ? values[keys[0]] : undefined,
            key: keys[0],
            value: keys[1],
          });
        }
        return `${keys[1]}: ${values != null ? values[keys[0]] : ''}`;
      }
      if (keysc.length === 2) {
        const lup = values[keysc[0]];
        if (_.isFunction(lup)) return lup(keysc[1]);
        return lup != null ? lup[keysc[1]] : undefined;
      }
      if (outputKeys) return `{${key}}`;
      return values != null ? values[key] : undefined;
    })();

    if (r == null)
      logger.error(`Key ${key} not found for text '${text}' (${JSON.stringify(values)})`);
    return r || '';
  });
  if (html === 'markdown') {
    if (customRenderer) marked.use({ useNewRenderer: true, renderer: customRenderer });
    return marked(result);
  }
  if (html) return nl2br(result);
  return result;
};

const md5 = (text: string): string =>
  crypto
    .createHash('md5')
    .update(text)
    .digest('hex');

const asArray = (v: any): any | Array<any> => {
  if (_.isArray(v)) {
    return v;
  }
  if (v != null) {
    return [v];
  }
  return [];
};

const localizeDefaults = (context: {
  currencyISO: string,
  languageISO: string,
  ...
}): ({ currency: (key: string) => string }) => {
  const { Money } = require('./money');
  const currencies = currencyVars[context.currencyISO];
  return {
    currency(key: string) {
      if (currencies == null) {
        logger.warn('Currencies null', key, context.currencyISO);
        return '';
      }
      if (isNaN(parseInt(key))) {
        return money({ code: context.languageISO })(currencies[key], context.currencyISO, false);
      }
      const amount = parseInt(
        new Money(Number(key) * 100, 'EUR').asCurrency(context.currencyISO).asFloat(),
      );
      return money({ code: context.languageISO })(amount, context.currencyISO, false);
    },
  };
};

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

const isMobile = (detect: any): boolean => detect.mobile() !== null || detect.tablet() !== null || detect.os() === 'AndroidOS';
const isSpider = (detect: any) => detect.is('Bot');

const initContext = (
  req: express$Request,
  res: express$Response,
  user: ?Player,
  language: ?{ ...LangDef, ... },
) => {
  const supportedLanguages = configuration.languages();
  const detect = new MobileDetect(req.headers['user-agent']);
  const rip = getRemoteAddress(req);
  const countryInfo = country(req);
  const countryISO = (user != null ? user.details : countryInfo).CountryISO;

  const languageOverride = language != null && language.code;
  const userLanguage = user != null && user.languageISO;
  const langParam = req.body != null && req.body.language;
  const langQuery: any = req.query != null && req.query._lang;
  const defaultLanguage = _.first(supportedLanguages).code;

  const languageISOfirstAttempt = (
    languageOverride ||
    userLanguage ||
    langParam ||
    langQuery ||
    defaultLanguage
  ).toLowerCase();

  const supportedLanguage = _.find(supportedLanguages, { code: languageISOfirstAttempt })
  const languageISO =
    supportedLanguage && supportedLanguage.override
      ? supportedLanguage.override
      : supportedLanguage?.code || languageISOfirstAttempt;

  const currencyISO =
    guard(
      user != null ? user.details : countryForISO(guard(country(req), (x7) => x7.CountryISO)),
      (x5) => x5.CurrencyISO,
    ) || defaultCurrency;

  const context: RequestContext = {
    playerId: user != null ? Number(user.details.ClientID) : -1,
    languageISO,
    currencyISO,
    countryISO,
    detect,
    mobile: isMobile(detect),
    spider: isSpider(detect),
    country: countryInfo,
    whitelisted: _.includes(configuration.whitelistedIps, rip),
  };
  req.context = context;
};

const isWhitelistedIp = (req: express$Request): any | boolean => configuration.isIpAllowed(getRemoteAddress(req)) || (req.context && req.context.whitelisted);

const whitelistAuth = (): ((
  req: express$Request,
  res: express$Response,
  next: express$NextFunction
) => mixed) => (req: express$Request, res: express$Response, next: express$NextFunction) => {
  if (isWhitelistedIp(req)) {
    return next();
  }
  logger.error('No access to whitelist-only page from', getRemoteAddress(req));
  return next('404');
};

const detectLangCode = (req: express$Request): any => {
  const languages = configuration.languages().filter(x => x.autoDetect !== false);
  const langCode = languageParser.pick(languages.map(x => x.code), req.headers['accept-language']);
  const cookieLanguage = _.find(languages, l => l.code === req.cookies.ld_lang);
  const c = country(req);
  return cookieLanguage || configuration.countryMappings()[c.CountryISO] || langCode || languages[0].code;
};

const populatePath = (path: string, params: any): string => path.replace(/(:)([_\w1..9]*)/g, lookup => params[lookup.substring(1)]);

const matchTags = (tags: string[], k: string): boolean => {
  for (const key of Array.from(k.split('|'))) {
    if (key[0] === '!' ? !_.includes(tags, key.substring(1)) : _.includes(tags, key)) {
      return true;
    }
  }
  return false;
};

const matchAllTags = (tags: string[], flags: string[]): boolean => _.every(tags, tag => matchTags(flags, tag));

module.exports = {
  getRemoteAddress,
  money,
  pluckAll,
  nl2br,
  populate,
  md5,
  asArray,
  localizeDefaults,
  capitalize,
  isWhitelistedIp,
  initContext,
  countryForISO,
  isMobile,
  country,
  formatMoney,
  pluckAllIfExists,
  whitelistAuth,
  detectLangCode,
  populatePath,
  matchTags,
  matchAllTags,
  formatDate,
  defaultCurrency: (): any => defaultCurrency,
};
