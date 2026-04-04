/* @flow */
import type { EEGEvent } from './eeg-types';

const { createProducer } = require('./eeg-kafka');

let producer = null;
const lazyEEGEventProducer = async (): Promise<(payload: EEGEvent | Array<EEGEvent>) => Promise<void>> => {
  if (producer == null) producer = await createProducer<EEGEvent>('com.idefix.events.Event');
  return producer;
};

module.exports = {
  lazyEEGEventProducer,
};
