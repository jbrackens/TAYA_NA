/* @flow */
import type { BusConsumerPayload } from 'gstech-core/modules/types/bus'
import type { EEGEvent } from './eeg-types';

const logger = require('gstech-core/modules/logger');
const { createConsumer } = require('./eeg-kafka');
const config = require('../../../../config');

const events: BusConsumerPayload<EEGEvent>[] = [];
createConsumer<EEGEvent>('com.idefix.events.Event', payload => {
  logger.info('EEGEvent consumed:', payload.data.messageType, payload);

  if (config.isTest) events.push(payload);
  return Promise.resolve();
});

module.exports = {
  events,
};
