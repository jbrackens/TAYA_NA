/* @flow */
import type { WageringEvent, DepositEvent, PlayerUpdateEvent } from 'gstech-core/modules/types/bus';

const { createProducer } = require('gstech-core/modules/bus');

let producer1 = null;
const lazyProducingWageringEventProducer = async (): Promise<(payload: WageringEvent | Array<WageringEvent>) => void> => {
  if (producer1 == null) producer1 = await createProducer<WageringEvent>('WageringEvent')
  return producer1;
};

let producer2 = null;
const lazyProducingDepositEventProducer = async (): Promise<(payload: DepositEvent | Array<DepositEvent>) => void> => {
  if (producer2 == null) producer2 = await createProducer<DepositEvent>('DepositEvent');
  return producer2;
};

let producer3 = null;
const lazyProducingPlayerUpdateEventProducer = async (): Promise<
  (payload: PlayerUpdateEvent | Array<PlayerUpdateEvent>) => void,
> => {
  if (producer3 == null) producer3 = await createProducer<PlayerUpdateEvent>('PlayerUpdateEvent');
  return producer3;
};

module.exports = {
  lazyProducingWageringEventProducer,
  lazyProducingDepositEventProducer,
  lazyProducingPlayerUpdateEventProducer,
};
