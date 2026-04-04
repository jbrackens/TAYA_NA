/* @flow */
const Bull = require('bull');
const configuration = require('./configuration');
const redis = require('./redis');

const createQueue = (name: string) => {
  const queue = new Bull(name, { createClient: () => redis.newClient('', ''), prefix: `{${configuration.project()}:bull}` });
  queue.clean(5000);
  queue.clean(5000, 'failed');
  return queue;
};

const emailDirectQueue: any = createQueue('email-direct');

module.exports = {
  emailDirectQueue,
};
