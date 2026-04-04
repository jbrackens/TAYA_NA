/* @flow */
import type { LangDef } from './api';
import type { MemoedCountriesResponse, MemoedCurrenciesResponse } from './modules/memoized';

const _ = require('lodash');
const configuration = require('./configuration');
const utils = require('./utils');
const { localize, languages, mapLang } = require('./localization');
const repository = require('./repository');
const { calculateFraudToken } = require('./fraud-token');
const { getCountries, getCurrencies, getBlockedCountries } = require('./modules/memoized');
const logger = require('./logger');
const redis = require('./redis');
const { isValidSession, logout } = require('./modules/session');

const checkIpCountry = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const { CountryISO } = req.context.country;
  const remoteIp = utils.getRemoteAddress(req);
  if (CountryISO && !configuration.isIpAllowed(remoteIp)) {
    const [countries, blocked] = [await getCountries(), await getBlockedCountries()];
    const kickOut = (_.includes(blocked, CountryISO) || !_.some(countries, ['CountryISO', CountryISO]));
    if (kickOut) {
      logger.error(`Player "${req.context.playerId}" (${remoteIp}) [${CountryISO}] kicked out.`);
      const loggedin = await isValidSession(req, true);
      if (loggedin) await logout(req)
      return res.sendStatus(451)
    }
  }
  return next();
};

const updateDetails = async (journey: any): Promise<
  {
    VIPLevel?: number,
    bountiesCount?: number,
    coinBalance?: number,
    rewardsCount?: number,
    shopBalance?: {
      balance: number,
      progress: number,
      target: number,
      theme: string
    },
    shopItems?: boolean,
    spinCount?: number,
    timestamp: number,
  },
> => {
  let shopItems;
  let shopBalance;
  let coinBalance;
  let spinCount;
  let bountiesCount;
  let rewardsCount;
  let VIPLevel;
  if (configuration.project() === 'kalevala' && process.env.KALEVALA_V2) { // FIXME: kalevala-v2
    shopBalance = await journey.shopBalance();
    shopItems = shopBalance.balance > 0;
  } else if (configuration.project() === 'olaspill' || configuration.project() === 'kalevala') {
    coinBalance = await journey.coinBalance();
    const items = await journey.shopItems();
    shopItems = items.filter(x => !x.locked).length > 0;
  } else if (configuration.project() === 'jefe') {
    spinCount = await journey.wheel();
    bountiesCount = journey.bountiesCount;
    VIPLevel = await journey.level();
  } else if (configuration.project() === 'luckydino'||
             configuration.project() === 'fiksu' ||
             configuration.project() === 'vie' ||
             configuration.project() === 'sportnation') {
    rewardsCount = journey.rewardsCount;
  }
  return {
    VIPLevel,
    bountiesCount,
    rewardsCount,
    spinCount,
    shopBalance,
    coinBalance,
    shopItems,
    timestamp: new Date().getTime(),
  };
};


const common = (
  lang: { ...LangDef, ... },
  req: express$Request,
  res: express$Response,
  publicPage: ?boolean = false,
  sidebarHidden: ?boolean = false, // eslint-disable-line no-unused-vars
  extraWrapper: ?string = null,
): { ... } => {
  const isMobile = req.context.mobile;
  const wrapperclass = [
    `lang-${lang.code}`,
    `currency-${req.context.currencyISO.toLowerCase()}`,
    `country-${req.context.countryISO || 'XX'}`,
  ];
  if (isMobile) wrapperclass.push('mobile');
  if (extraWrapper) wrapperclass.push(extraWrapper);
  res.expose(lang, 'lang');
  res.expose(isMobile, 'isMobile');
  if (publicPage) res.expose(calculateFraudToken(req), 'liveChatToken');
  res.expose(configuration.clientConfig(), 'clientConfig');
  res.expose(configuration.cdnBase(), 'CDN');
  res.expose(req.context.currencyISO, 'currencyISO');
  return {
    CDN(path: string) {
      return configuration.cdn(path);
    },
    link(path: string) {
      if (publicPage) return `/${lang.code}${path}`;
      return `/loggedin${path}`;
    },
    isMobile,
    isSpider: req.context.spider,
    wrapperclass: wrapperclass.join(' '),
    _,
    localize: localize(lang.code, utils.localizeDefaults(req.context)),
    lang: mapLang(lang),
    languages: languages.filter(({ override }) => !override).map(mapLang),
    context: req.context,
    pagepath: req.user == null ? req.path.substring(4) : req.path.substring(1),
    configuration,
    publicPage,
  };
};

type RegistrationFormData = {
  countries: ?MemoedCountriesResponse,
  country: any,
  currencies: MemoedCurrenciesResponse,
  languages: any,
  phoneCountry: ?any,
  phoneRegions: Array<any>,
  verificationChannel: 'email' | 'sms',
  initialResetPasswdVerificationChannel: 'email' | 'sms',
};
const registrationFormData = async (req: express$Request): Promise<RegistrationFormData> => {
  const { country } = req.context;
  const { CountryISO } = country;
  const [countries, c, phoneRegions] = await Promise.all([
    getCountries(),
    getCurrencies(),
    repository.phoneRegions(),
  ]);
  const currencies =
    CountryISO === 'NO' ? c.filter((y) => _.includes(['EUR', 'NOK'], y.CurrencyISO)) : c;
  const phoneCountry = _.find(phoneRegions, (r) => _.includes(r.countries, CountryISO));
  const { signUpVerificationChannel, resetPasswdVerificationChannel } = configuration;
  const response = {
    countries,
    currencies,
    phoneRegions,
    phoneCountry,
    country,
    languages: languages.filter(({ override }) => !override).map(mapLang),
    verificationChannel: signUpVerificationChannel(req).primary,
    initialResetPasswdVerificationChannel: resetPasswdVerificationChannel(req).primary,
  };
  logger.info('++++ registrationFormData', { response });
  return response;
};

const apiLoggedIn = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  const valid = await isValidSession(req);
  const pnpForm = req.params.id && (await redis.getTemporary('payment-form', req.params.id))
  if (valid || pnpForm) return next();
  return res.sendStatus(401);
};

const redirectScript = (target: string): string => `<html><script>window.top.location = "${target}";</script></html>`;
const redirectScriptWithDelay = (timeout: number, target: string): string => `
<html>
  <head>
    <title>Loading...</title>
    <script>
      setTimeout(function (){window.top.location="${target}";}, ${timeout});
    </script>
    <style>
      body {
        background-color: #fff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        position: relative;
      }
      h1 {
        font-size: 14px;
        font-weight: 100;
        color: #8a8f95;
        font-family: sans-serif, serif;
        margin-top: 32px;
      }
      #loading {
        display: inline-block;
        width: 96px;
        height: 96px;
        border: 4px solid #c1cad6;
        border-radius: 50%;
        border-top-color: #262730;
        animation: spin 1s ease-in-out infinite;
        -webkit-animation: spin 1s ease-in-out infinite;
      }
      p {
        color: #262730;
      }
      @keyframes spin {
        to {
          -webkit-transform: rotate(360deg);
        }
      }
      @-webkit-keyframes spin {
        to {
          -webkit-transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <div id="loading"></div>
    <h1>Please wait while your payment is being processed...</h1>
  </body>
</html>
`;

const brandserverMiddleware = (req: express$Request, res: express$Response, next: express$NextFunction): mixed => {
  utils.initContext(req, res, req.user);
  if (req.query.btag && _.isString(req.query.btag)) {
    res.cookie('ldaffid2', req.query.btag, { path: '/', secure: configuration.productionMode(), maxAge: 1000 * 60 * 60 * 24 * 30 });
    logger.debug('User from affiliate', req.query.btag, req.query.rid || req.query.cid, req.query);
  }
  return next();
}

module.exports = {
  redirectScript,
  redirectScriptWithDelay,
  apiLoggedIn,
  common,
  updateDetails,
  registrationFormData,
  brandserverMiddleware,
  checkIpCountry,
};
