// @flow
const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');
const l = require('./logger');

const toWinstonLogLevel = (level: number) => {
  switch (level) {
    case logLevel.ERROR:
    case logLevel.NOTHING:
      return 'error';
    case logLevel.WARN:
      return 'warn';
    case logLevel.INFO:
      return 'info';
    case logLevel.DEBUG:
    default:
      return 'debug';
  }
};

module.exports = (config.kafka &&
  new Kafka({
    logLevel: logLevel.INFO,
    clientId: `${config.appName}`,
    brokers: config.kafka.brokers.map((k) => `${k.host}:${k.port}`),
    ssl: config.kafka && config.kafka.ssl,
    connectionTimeout: 15000,
    enforceRequestTimeout: false,
    logCreator: (level) => ({ log: { message, timestamp, logger, ...extra } }) => {
      l[toWinstonLogLevel(level)]('Kafka', message, JSON.stringify(extra));
    },
  }): ?any);
