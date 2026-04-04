/* @flow */
import type { DepositEvent, PlayerUpdateEvent } from 'gstech-core/modules/types/bus';

const pg = require('gstech-core/modules/pg');
const { createConsumer } = require('gstech-core/modules/bus');

const { handleDepositEvent } = require('./event-handlers/handleDepositEvent');
const { handlePlayerUpdateEvent } = require('./event-handlers/handleUpdateEvent');

const startConsumingDepositEvent = (): Promise<void> =>
  createConsumer<DepositEvent>('DepositEvent', (payload) => handleDepositEvent(pg, payload.data));

const startConsumingPlayerUpdateEvent = (): Promise<void> =>
  createConsumer<PlayerUpdateEvent>('PlayerUpdateEvent', (payload) => handlePlayerUpdateEvent(pg, payload.data));

module.exports = {
  startConsumingDepositEvent,
  startConsumingPlayerUpdateEvent,
};
