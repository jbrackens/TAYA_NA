/* @flow */
import type { BusConsumerPayload } from 'gstech-core/modules/types/bus';

const _ = require('lodash');
const { axios } = require('gstech-core/modules/axios');
const { Partitioners } = require('kafkajs');
const { SchemaRegistry, readAVSCAsync } = require('@kafkajs/confluent-schema-registry')

const kafka = require('gstech-core/modules/kafka');
const logger = require('gstech-core/modules/logger');

const config = require('../../../../config');

const errorTypes = ['unhandledRejection', 'uncaughtException', 'exit'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

const cfg: any = config.kafka && config.kafka.registry;
const registryUrl = `http://${cfg.host}:${cfg.port}`;
const registry = new SchemaRegistry({ host: registryUrl });

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

const createProducer = async function generic<T: Object>(name: string): Promise<(payload: T | T[]) => Promise<void>> {
  if (!kafka) {
    return async (payload: T | T[]) => {
      logger.error('Kafka is disabled. The message will not be sent to Kafka.', payload);
    };
  }

  const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();

  addErrorHandlers(producer);

  const schema = await readAVSCAsync('./server/modules/core/notifications-eeg/event.avsc');
  const { data: response } = await axios.post(
    `${registryUrl}/subjects/com.idefix.events.Event/versions`,
    { schema: JSON.stringify(schema) },
  );

  return async (payload: T | T[]) => {
    const messages = await Promise.all(
      _.castArray(payload).map(async (p) => ({ value: await registry.encode(response.id, p) })),
    );
    await producer.send({ topic: name, messages });
  };
};

const createConsumer = async function generic<T: Object>(
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
      const data: T = await registry.decode(message.value);
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
