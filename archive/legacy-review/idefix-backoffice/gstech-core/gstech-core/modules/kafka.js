const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');

module.exports = config.kafka.length > 0 && new Kafka({
  logLevel: logLevel.ERROR,
  clientId: `${config.appName}`,
  brokers: config.kafka.map(k => `${k.host}:${k.port}`),
});
