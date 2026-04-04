/* @flow */
import type { WageringEvent } from 'gstech-core/modules/types/bus';

const pg = require('gstech-core/modules/pg');
const { createConsumer } = require('gstech-core/modules/bus');
const { handleBetEvent } = require('./eventHandlers');

const startConsumingWageringEvent = (): Promise<void> =>
  createConsumer<WageringEvent>('WageringEvent', payload => handleBetEvent(pg, payload.data));

module.exports = {
  startConsumingWageringEvent,
};
