/* @flow */
import type { RewardProgressUpdateEvent, CreditRewardEvent } from 'gstech-core/modules/types/bus';

const { createProducer } = require('gstech-core/modules/bus');

let producer1 = null;
const lazyRewardProgressUpdateEventProducer = async (): Promise<
  (
    payload: RewardProgressUpdateEvent | Array<RewardProgressUpdateEvent>
  ) => void,
> => {
  if (producer1 == null)
    producer1 = await createProducer<RewardProgressUpdateEvent>('RewardProgressUpdateEvent');
  return producer1;
};

let producer2 = null;
const lazyRewardCreditedEventProducer = async (): Promise<
  (payload: CreditRewardEvent | Array<CreditRewardEvent>) => void,
> => {
  if (producer2 == null) producer2 = await createProducer<CreditRewardEvent>('CreditRewardEvent');
  return producer2;
};

module.exports = {
  lazyRewardProgressUpdateEventProducer,
  lazyRewardCreditedEventProducer,
};
