/* @flow */
const { createProducer } = require('gstech-core/modules/bus');

let producer1 = null;
const lazyNotificationEventTriggerProducer = async (): Promise<(payload: any | Array<any>) => void> => {
  if (producer1 == null) producer1 = await createProducer<any>('NotificationEvent');
  return producer1;
};

module.exports = {
  lazyNotificationEventTriggerProducer,
};
