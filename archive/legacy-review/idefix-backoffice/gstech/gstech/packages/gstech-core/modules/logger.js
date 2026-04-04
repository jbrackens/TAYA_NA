/* @flow */
const _ = require('lodash');
const winston = require('winston');
const LokiTransport = require('winston-loki');
const stringify = require('json-stringify-safe');

const config = require('./config');

const HttpError = require('./HttpError');

const prevNiceFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY.MM.DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.splat(),
  winston.format.simple(),
  winston.format.printf(
    (info) => `${String(info.timestamp)} ${`[${info.level}]`.padEnd(17, ' ')}: ${info.message}`,
  ),
);

const shortenServiceName = (fullName: string) => {
  if (fullName.endsWith('worker'))
    return fullName
      .replace('luckydino', 'ld')
      .replace('jefe', 'cj')
      .replace('justwow', 'jw')
      .replace('kalevala', 'jw')
      .replace('hipspin', 'hs')
      .replace('fiksu', 'hs')
      .replace('olaspill', 'os')
      .replace('sportnation', 'fs')
      .replace('freshspins', 'fs')
      .replace('vie', 'vb')
      .replace('gstech', 'gs');

  return (
    {
      'gstech-backend': 'backend',
      'gstech-reporting': 'reporting',
      'affmore-backend': 'affmore',
      'lotto-backend': 'lotto',
      paymentserver: 'payment',
      walletserver: 'wallet',
      rewardserver: 'reward',
      complianceserver: 'compliance',
      campaignserver: 'campaign',
      // $FlowFixMe[invalid-computed-prop]
    }[fullName] || fullName.replace('gstech-', '').replace('-backend', '')
  );
};

const lnavJsonFormat = winston.format.combine(
  winston.format.uncolorize(),
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZZ' }),
  winston.format.splat(),
  winston.format(
    ({
      dd,
      message,
      metadata,
      ...rest
    }: {
      dd: any,
      metadata: mixed,
      level: string,
      message: string,
      ...
    }) => ({
      ...rest,
      metadata,
      message: _.truncate(message, { length: 5000 }).replace(/\s+/g, ' ').replace(/\n/g, ''),
      service: config.logger.service || config.appName,
      service_short: shortenServiceName(config.logger.service || config.appName),
      trace_id: dd?.trace_id,
      span_id: dd?.span_id,
    }),
  )(),
  winston.format.json(),
);

const winstonLoggerConfig = {
  level: process.env.RUNNER_DEBUG !== '1' ? config.logger.level : 'debug',
  silent: process.env.CI || process.env.CI_DEP ? process.env.RUNNER_DEBUG !== '1' : false,
  transports: [
    new winston.transports.Console<$winstonLevels>({
      format:
        config.logger.format === 'nice' || process.env.CI || process.env.CI_DEP
          ? prevNiceFormat
          : lnavJsonFormat,
    }),
    ...(config.loki
      ? [
          new LokiTransport({
            host: config.loki.host,
            format: lnavJsonFormat,
            json: true,
            level: 'debug',
            onConnectionError: (err) => console.log('Loki connection error', err), // eslint-disable-line no-console
          }),
        ]
      : []),
    ...(config.logger.local
      ? [
          new winston.transports.File<$winstonLevels>({
            level: 'debug',
            filename: config.logger.local,
            maxsize: 100000000,
            maxFiles: 100,
            tailable: true,
            zippedArchive: true,
            format: lnavJsonFormat,
          }),
        ]
      : []),
  ],
};

let loggedConfig = false;
if (!loggedConfig && process.env.RUNNER_DEBUG === '1') {
  const envVars = _.pickBy(process.env, (v, k) => _.toUpper(k) === k);
  console.log({ envVars, winstonLoggerConfig }); // eslint-disable-line no-console
  loggedConfig = true;
}

const _logger: $winstonLogger<$winstonLevels> = winston.createLogger(winstonLoggerConfig); // eslint-disable-line no-underscore-dangle

const replacer = (k: string, v: any) => (v === undefined ? 'undefined' : v);

const formatMessage = (args: mixed[]): any => {
  const message = args
    .map((a) => {
      if (a instanceof HttpError) return `(${a.httpCode}) ${a.stack}`;
      if (a instanceof Error) return a.stack;
      if (a instanceof Object) return `\n${stringify(a, replacer, 2)}`;
      if (a instanceof Array) return `\n${stringify(a, replacer, 2)}`;
      if (typeof a === 'object') return `\n${stringify(a, replacer, 2)}`;
      return a;
    })
    .join(' | ');

  return { message };
};

type Logger = {
  error: (...args: mixed[]) => void,
  warn: (...args: mixed[]) => void,
  info: (...args: mixed[]) => void,
  http: (...args: mixed[]) => void,
  verbose: (...args: mixed[]) => void,
  debug: (...args: mixed[]) => void,
  silly: (...args: mixed[]) => void,
  ...
};
const logger: Logger = _.fromPairs(
  _.map(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], (lvl) => [
    lvl,
    _.wrap(_logger[lvl], (fn, ...args) =>
      fn(formatMessage(args).message, {
        metadata: args.filter((a) => a instanceof Object || typeof a === 'object'),
      }),
    ),
  ]),
);
module.exports = logger;
