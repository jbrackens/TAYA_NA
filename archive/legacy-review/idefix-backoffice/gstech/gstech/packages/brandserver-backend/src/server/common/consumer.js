/* @flow */
import type { RewardProgressUpdateEvent, CreditRewardEvent } from 'gstech-core/modules/types/bus';

const { createConsumer } = require('gstech-core/modules/bus');
const { handleRewardProgressEvent, handleCreditRewardEvent } = require('./websocket');

const startConsumingRewardProgressEvent = (): Promise<void> =>
  createConsumer<RewardProgressUpdateEvent>('RewardProgressUpdateEvent', payload => handleRewardProgressEvent(payload.data));

const startConsumingCreditRewardEvent = (): Promise<void> =>
  createConsumer<CreditRewardEvent>('CreditRewardEvent', payload => handleCreditRewardEvent(payload.data));

module.exports = {
  startConsumingRewardProgressEvent,
  startConsumingCreditRewardEvent,
};
