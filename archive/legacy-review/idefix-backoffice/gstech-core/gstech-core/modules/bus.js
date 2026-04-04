/* @flow */
import type { Producer, Consumer } from 'kafkajs';
import type { BusConsumerPayload } from './types/bus';

const _ = require('lodash');
const { Subject } = require('rxjs');
const { CompressionTypes } = require('kafkajs');

const config = require('./config');
const logger = require('./logger');
const kafka = require('./kafka');

const errorTypes = ['unhandledRejection', 'uncaughtException', 'exit'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

const swallowPayload = function generic<T: {}>(subject: Subject<T | T[]>): Subject<T | T[]> {
  subject.subscribe({
    next: (payload) => { }, // eslint-disable-line
  });
  return subject;
};

const addErrorHandlers = function generic<T: {}>(producer: Producer | Consumer, subject: Subject<T | T[]> | Subject<BusConsumerPayload<T>>) {
  errorTypes.map(type => process.on(type, async (exception) => {
    try {
      await producer.disconnect();
      subject.complete();
      logger.error('Bus error, exiting', { type }, exception);
      process.exit(0);
    } catch (e) {
      logger.error('Bus exception, exiting', { type }, exception, e);
      process.exit(1);
    }
  }));

  signalTraps.map(type => process.once(type, async () => {
    try {
      await producer.disconnect();
    } finally {
      subject.complete();
      process.kill(process.pid, type);
    }
  }));
};

const createProducerSubject = async function generic<T: {}>(name: string): Promise<Subject<T | T[]>> {
  const subject = new Subject<T | T[]>();
  if (!kafka) return swallowPayload<T>(subject);

  const producer = kafka.producer();
  await producer.connect();

  addErrorHandlers<T>(producer, subject);

  subject.subscribe({
    next: (payload: T | T[]) => {
      const messages = _.castArray(payload).map(p => ({ value: JSON.stringify(p) }));
      producer.send({ topic: name, compression: CompressionTypes.GZIP, messages });
      logger.debug('Sent message to Kafka', { topic: name, payload });
    },
    complete: () => {
      producer.disconnect();
      logger.info('Subject is completed');
    },
    error: (error) => {
      producer.disconnect();
      logger.error(error);
    },
  });

  return subject;
};

const createConsumerSubject = async function generic<T: {}>(names: string | string[], fromBeginning: boolean = false): Promise<{ consumer: Consumer, subject: Subject<BusConsumerPayload<T>>}> {
  const subject = new Subject<BusConsumerPayload<T>>();
  if (!kafka) return { consumer: null, subject };

  const topics = _.castArray(names);
  const consumer = kafka.consumer({ groupId: `${config.appName}:${topics[0]}` });
  await consumer.connect();

  addErrorHandlers<T>(consumer, subject);

  topics.map(topic => consumer.subscribe({ topic, fromBeginning }));
  await consumer.run({
    eachMessage: ({ topic, message }) => {
      const data: T = JSON.parse(message.value);
      if (!data) {
        subject.error('Message is not a JSON');
      } else {
        logger.debug('Received message from Kafka', { topic, data });

        const payload: BusConsumerPayload<T> = { name: topic, data };
        subject.next(payload);
      }
    },
  });

  return { subject, consumer };
};

module.exports = {
  createProducerSubject,
  createConsumerSubject,
};
