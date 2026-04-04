// @flow
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const rateLimit = require('express-rate-limit');
const { RedisStore: RedisRateLimiter } = require('rate-limit-redis');
const { axios } = require('gstech-core/modules/axios');
const { prefixed } = require('gstech-core/modules/phoneNumber');

const logger = require('./logger');
const utils = require('./utils');
const redis = require('./redis');
const config = require('./config');
const configuration = require('./configuration');

const RL_STORE_PREFIX = `{${configuration.project()}}rl:`;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 5;
const DEFAULT_COUNTRY_LIMIT = 12;
const FALLBACK_LIMIT = 3;

const COUNTRY_LIMITS = {
  BR: 100,
  FI: 50,
  NO: 50,
  NZ: 50,
  CH: 50,
  US: 30,
  PR: 30,
  DE: 30,
  MX: 30,
  CA: 20,
  MT: 15,
};

const LAX_CAPTCHA_COUNTRIES = [
  'FI',
  'NZ',
  'CA',
  'BR',
  'CH',
  'PR',
  'CO',
  'MX',
  'AR',
  'PY',
  'MT',
  'DE',
  'NL',
  'US',
];

const limiterClientStore = redis.newClient();

const loadScript = async (): Promise<string> => {
  const result = await limiterClientStore.call(
    'SCRIPT',
    'LOAD',
    `
      local a = tonumber(redis.call('GET', KEYS[1])) or 0
      local b = tonumber(redis.call('GET', KEYS[2])) or 0
      local c = tonumber(redis.call('GET', KEYS[3])) or 0
      local json_obj = cjson.encode({ ipaddr = a, region = b, mailaddr = c })
      return json_obj
    `
      .replace(/^\s+/gm, '')
      .trim(),
  );
  if (typeof result !== 'string') logger.error('XXX LIMITER:loadscript', { result });
  return result;
};

const getRegionCode = (phone: string): string =>
  phoneUtil.getRegionCodeForNumber(phoneUtil.parse(prefixed(phone)));

type LimiterLoadResponse = { regionLoad: number, ipLoad: number, emailLoad: number };
const getLimiterLoads = async (captchaQuery: CaptchaQueryObject): Promise<LimiterLoadResponse> => {
  const { remoteIp, phone, region, email } = captchaQuery;
  const regionCode = phone ? getRegionCode(phone) : region;
  const {
    region: regionLoad,
    ipaddr: ipLoad,
    mailaddr: emailLoad,
  } = await limiterClientStore
    .call(
      'EVALSHA',
      await loadScript(),
      3,
      `${RL_STORE_PREFIX}${remoteIp}`,
      `${RL_STORE_PREFIX}${regionCode || ''}`,
      `${RL_STORE_PREFIX}${email || ''}`,
    )
    .then(JSON.parse);
  const limiterLoads = { regionLoad, ipLoad, emailLoad };
  logger.info('+++ LIMITER LOADS', { limiterLoads });
  return limiterLoads;
};

type CaptchaQueryObject = { remoteIp: IPAddress, phone?: string, region?: string, email?: string };
const requiresCaptcha = async (captchaQuery: CaptchaQueryObject): Promise<boolean> => {
  const { phone, region, email } = captchaQuery;
  const regionCode = phone ? getRegionCode(phone) : region;
  if (regionCode && !LAX_CAPTCHA_COUNTRIES.includes(regionCode)) return true;
  const { regionLoad, ipLoad, emailLoad } = await getLimiterLoads(captchaQuery);
  if (ipLoad >= IP_LIMIT) return true;
  if (email && emailLoad >= EMAIL_LIMIT) return true;
  // $FlowFixMe[invalid-computed-prop]
  if (region && regionLoad >= (COUNTRY_LIMITS[region] || DEFAULT_COUNTRY_LIMIT)) return true;
  return false;
};

const requiresFallBackTest = (): boolean => false;

const requiresFallBackByRateLimit = async (captchaQuery: CaptchaQueryObject): Promise<boolean> =>
  (await getLimiterLoads(captchaQuery)).ipLoad >= FALLBACK_LIMIT;

const verifyCaptcha = async (req: express$Request): Promise<boolean> => {
  if (!req.body.token) return false;
  const url = 'https://www.google.com/recaptcha/api/siteverify';
  const params = {
    secret: config.google.reCaptchas[configuration.shortBrandId()].secretKey,
    response: req.body.token,
    remoteip: utils.getRemoteAddress(req),
  };
  logger.debug('>>> Captcha', { url, params });
  const { data: captcha } = await axios.request({ method: 'POST', url, params });
  logger.debug('<<< Captcha', { captcha });
  return captcha.success;
};

const limitHandler = (
  request: express$Request,
  response: express$Response,
  next: express$NextFunction,
  options: expressRateLimit$Options,
) => {
  logger.warn(`!!! RATELIMITED ${options.message || ''}`, { path: request.path, ip: request.ip });
  return response.status(options.statusCode).send(options.message);
};

const getMaxForRegion = ({ body }: express$Request): number =>
  body.phone
    // $FlowFixMe[invalid-computed-prop]
    ? COUNTRY_LIMITS[getRegionCode(body.phone)] || DEFAULT_COUNTRY_LIMIT
    : DEFAULT_COUNTRY_LIMIT;

const makeLimiterStore = (
  prefix?: string = RL_STORE_PREFIX,
  resetExpiryOnChange?: boolean = false,
) =>
  new RedisRateLimiter({
    prefix,
    resetExpiryOnChange,
    sendCommand: (...args) => limiterClientStore.call(...args),
  });

const makeRateLimiterMiddleware = (
  options?: Partial<expressRateLimit$Options>,
): express$Middleware<express$Request, express$Response> =>
  rateLimit({
    windowMs: 10 * 60 * 1000, // 10m
    standardHeaders: true,
    skip: (req) => config.isTest || req.headers['X-Captcha-Verified'],
    handler: limitHandler,
    store: makeLimiterStore(),
    ...options,
  });

const verifyCaptchaMiddleware: express$Middleware<express$Request, express$Response> = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
) => {
  req.headers['X-Captcha-Verified'] = await verifyCaptcha(req);
  return next();
};

const ipRateLimiter: express$Middleware<express$Request, express$Response> =
  makeRateLimiterMiddleware({ max: IP_LIMIT, message: 'SMS-IP' });

const smsRegionRateLimiter: express$Middleware<express$Request, express$Response> =
  makeRateLimiterMiddleware({
    message: 'SMS-GEO',
    max: getMaxForRegion,
    keyGenerator: ({ body }) => getRegionCode(body.phone),
  });

const emailPwResetRateLimiter: express$Middleware<express$Request, express$Response> =
  makeRateLimiterMiddleware({
    message: 'SMS-GEO',
    max: getMaxForRegion,
    keyGenerator: ({ body }) => body.email,
  });

const smsRateLimiterMiddlewares = [verifyCaptchaMiddleware, ipRateLimiter, smsRegionRateLimiter];
const emailRateLimiterMiddlewares = [
  verifyCaptchaMiddleware,
  ipRateLimiter,
  emailPwResetRateLimiter,
];

module.exports = {
  smsRateLimiterMiddlewares,
  emailRateLimiterMiddlewares,
  requiresCaptcha,
  requiresFallBackTest,
  requiresFallBackByRateLimit,
};
