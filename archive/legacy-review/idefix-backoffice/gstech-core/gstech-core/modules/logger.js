/* @flow */
const winston = require('winston');
const WinstonGraylog2 = require('winston-graylog2');
const stringify = require('json-stringify-safe');

const config = require('./config');

const HttpError = require('./HttpError');

const timeFormatter = winston.format.timestamp({ format: 'YYYY.MM.DD hh:mm:ss' });
const colorFormatter = winston.format.colorize();
const restFormatters = [
  winston.format.splat(),
  winston.format.simple(),
  winston.format.printf(info => `${info.timestamp} ${(`[${info.level}]`).padEnd(17, ' ')}: ${info.message}`),
];

// TODO: needs better typing
const logger: any = winston.createLogger(({
  level: config.logger.level,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(timeFormatter, colorFormatter, ...restFormatters),
    }),
    ...(config.logger.enabled ? [new WinstonGraylog2({
      format: winston.format.combine(timeFormatter, ...restFormatters),
      graylog: {
        servers: [{ host: config.logger.server, port: config.logger.port }],
        facility: config.logger.facility,
      },
    })] : []),
  ],
}));

const formatMessage = (args: mixed[]): string => {
  const message = args.map((a) => {
    if (a instanceof HttpError) return `(${a.httpCode}) ${a.stack}`;
    if (a instanceof Error) return a.stack;
    if (a instanceof Object) return `\n${stringify(a, null, 2)}`;
    if (a instanceof Array) return `\n${stringify(a, null, 2)}`;
    if (typeof a === 'object') return `\n${stringify(a, null, 2)}`;
    return a;
  }).join(' | ');

  return message;
};

const error = (...args: mixed[]) => logger.error(formatMessage(args));
const warn = (...args: mixed[]) => logger.warn(formatMessage(args));
const info = (...args: mixed[]) => logger.info(formatMessage(args));
const verbose = (...args: mixed[]) => logger.verbose(formatMessage(args));
const debug = (...args: mixed[]) => logger.debug(formatMessage(args));
const silly = (...args: mixed[]) => logger.silly(formatMessage(args));

module.exports = { error, warn, info, verbose, debug, silly };
