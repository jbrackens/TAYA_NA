/* @flow */
import type { BusConsumerPayload } from './types/bus';

const _ = require('lodash');
const { CompressionTypes, Partitioners } = require('kafkajs');

const config = require('./config');
const logger = require('./logger');
const kafka = require('./kafka');

const errorTypes = ['unhandledRejection', 'uncaughtException', 'exit'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];


const addErrorHandlers = (producer: { disconnect: () => void }) => {
  errorTypes.map(type => process.on(type, async (exception) => {
    try {
      await producer.disconnect();
      logger.error('Bus error, exiting', { type }, exception);
      process.exit(1);
    } catch (e) {
      logger.error('Bus exception, exiting', { type }, exception, e);
      process.exit(2);
    }
  }));

  signalTraps.map(type => process.once(type, async () => {
    try {
      await producer.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  }));
};

const createProducer = async function generic<T: Object = { ... }>(
  name: string,
): Promise<(payload: T | T[]) => void> {
  if (!kafka) {
    return (payload: T | T[]) => {
      logger.error('Kafka is disabled. The message will not be sent to Kafka.', payload);
    };
  }

  const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();

  addErrorHandlers(producer);

  // TODO: await is omitted here because of Malta network outages causing problems.
  // Otherwise would be nice to have await before send()
  return (payload) => {
    const messages = _.castArray(payload).map((p) => ({ value: JSON.stringify(p) }));
    producer.send({ topic: name, compression: CompressionTypes.GZIP, messages });
  };
};

const createConsumer = async function generic<T: Object = { ... }>(
  names: string | string[],
  listener: (payload: BusConsumerPayload<T>) => Promise<any>,
  fromBeginning: boolean = false,
) {
  if (!kafka) {
    logger.error('Kafka is disabled. Consumer is not subscribed');
    return;
  }
  const topics = _.castArray(names);
  const consumer = kafka.consumer({ groupId: `${config.appName}:${topics[0]}` });
  await consumer.connect();

  addErrorHandlers(consumer);

  topics.map((topic) => consumer.subscribe({ topic, fromBeginning }));
  await consumer.run({
    partitionsConsumedConcurrently: 3,
    eachMessage: async ({ topic, message }) => {
      const data: T = JSON.parse(message.value);
      if (!data) {
        logger.error('Message is not a JSON', data);
      } else {
        const payload: BusConsumerPayload<T> = { name: topic, data };
        await listener(payload);
      }
    },
  });
};

module.exports = {
  createProducer,
  createConsumer,
};
