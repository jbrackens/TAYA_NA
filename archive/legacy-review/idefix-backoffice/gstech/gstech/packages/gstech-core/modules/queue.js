/* @flow */
const Queue = require('bull');
const config = require('./config');
const redis = require('./redis');

export type JobOptions = Partial<{
  priority: number,
  attempts: number,
  timeout: number,
  backoff: { priority?: number, type: string, delay: number },
}>;

export type Job<T> = { data: T, ... };

export type JobCallback<T> = (job: Job<T>, done?: Function) => void | Promise<void> | Promise<any>;
export type JobQueue<T> = {
  process(callback: JobCallback<T>, concurrency?: number): void,
  add(data: T, opts?: JobOptions): Promise<Job<T>>,
  on(status: string, callback: JobCallback<T>): Promise<void>,
  queue?: bull$Queue
};

const createQueue = function generic<T>(name: string, namespace: string = 'bull'): JobQueue<T> {
  const prefix = `{${config.appName}:${namespace}}`;
  const queue = new Queue(name, { createClient: () => redis.createClient(null), prefix });
  queue.clean(1000 * 60 * 5);
  queue.clean(1000 * 60 * 60, 'failed');

  return {
    process: (callback: any, concurrency: number = 1) => queue.process(concurrency, callback),
    // $FlowFixMe[class-object-subtyping]
    add: (data) => queue.add(data),
    on: (status: string, callback: any) => queue.on(status, callback),
    queue,
  };
};

module.exports = {
  createQueue,
};
