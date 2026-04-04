/* @flow */
const NRP = require('node-redis-pubsub');
const Redis = require('ioredis');
const _ = require('lodash');
const logger = require('./logger');
const configuration = require('./configuration');

const localCache: { [string]: any } = {};
const listeners: { [string]: (string: any) => any } = {};

const newClient = (
  hint: string = '',
  keyPrefix: string = `{${configuration.project()}${hint}}`,
): any => {
  const redisOpts = { keyPrefix, maxRetriesPerRequest: null, enableReadyCheck: false }; // reqd for bull 4+
  const hosts = configuration.redisOptions();
  const client =
    hosts.length > 1
      ? // slotsRefreshInterval to keep same v4 behavior - https://github.com/luin/ioredis/wiki/Upgrading-from-v4-to-v5
        new Redis.Cluster(hosts, { ...redisOpts, slotsRefreshInterval: 5000 })
      : new Redis(hosts[0], redisOpts);
  client.setMaxListeners(50);
  return client;
};

const client = newClient();

let nrp = {
  emit(key: string, value: mixed) {
    logger.warn('!!! NRP::emit redis [NOT READY]', { key, value });
  },
  // eslint-disable-next-line no-unused-vars
  on(key: string, cb: (value: any) => any) {
    logger.warn('!!! NRP::on redis [NOT READY]', { key });
  },
};

const get = async (name: string): Promise<void> => {
  const reply = await client.get(`data:${name}`);
  if (reply != null) return JSON.parse(reply);
};

const set = async (key: string, data: any) => {
  if (!listeners[key]) logger.warn(`!!! redis::set ${key} [NO LISTENER]`);
  await client.set(`data:${key}`, JSON.stringify(data));
  localCache[key] = data;
  logger.info(`+++ redis::set ${key} [BROADCAST]`);
  await nrp.emit(`data:refresh-${key}`, key);
};

const broadcast = async (namespace: string, data: any) => {
  await nrp.emit(`data:refresh-${namespace}`, JSON.stringify(data));
};

const setTemporary = async <T = any>(
  namespace: string,
  id: string,
  value: T,
  timeout: number = 60 * 60 * 24,
): Promise<void> => client.setex(`temporary:${namespace}:${id}`, timeout, JSON.stringify(value));

const removeTemporary = (namespace: string, id: string): Promise<void> =>
  client.del(`temporary:${namespace}:${id}`);

const getTemporary = async <T = any>(namespace: string, id: string): Promise<?T> => {
  const reply = await client.get(`temporary:${namespace}:${id}`);
  if (reply != null) return JSON.parse(reply);
  return null;
};

const hasFlag = async (namespace: string, value: string): Promise<boolean> => {
  const flag = await client.exists(`flag:${namespace}:${value}`);
  return flag > 0;
};
const removeFlag = (namespace: string, value: string): any =>
  client.del(`flag:${namespace}:${value}`);
const setFlag = (namespace: string, value: string, timeout: number = 60 * 60): any =>
  client.setex(`flag:${namespace}:${value}`, timeout, 'true');

const initDataSource = (key: string) => {
  const listener = listeners[key];
  if (listener == null) throw new Error(`Unable to init datasource ${key}`);
  nrp.on(`data:refresh-${key}`, listener);
  return listener();
};

let initialized = false;

const init = async () => {
  const nrpConf = {
    emitter: newClient(),
    receiver: newClient(),
    scope: configuration.project(),
  };
  nrp = new NRP(nrpConf);

  nrp.on('error', (error) => logger.error('XXX NRP::error', { error }));
  initialized = true;
  await Promise.all(Object.keys(listeners).map(initDataSource));
};

const listenNotifications = (key: string, listener: (string: any) => any) => {
  if (initialized)
    throw new Error(`Unable to register listener for ${key}. Redis already initialized`);
  listeners[key] = listener;
};

export type DataSource<I, T> = {
  (): I,
  (id: string): T,
  ...
};

const registerDataSource = (
  key: string,
  defaultValue: any = {},
  defaultSubElementValue: any = {},
): ((id: ?string) => any) => {
  listenNotifications(key, async () => {
    logger.debug(`>>> registerDataSource ${key}`);
    const data = await get(key);
    if (data) {
      logger.debug(`<<< registerDataSource ${key}`, { size: _.size(data) });
      localCache[key] = data;
    } else logger.warn(`!!! registerDataSource ${key} [NODATA]`);
  });

  const fetcher = (id: ?string) => {
    if (id !== undefined) {
      if (localCache[key] != null) return localCache[key][id];
      return defaultSubElementValue;
    }
    return localCache[key] || defaultValue;
  };
  return fetcher;
};

const dataSource = <I, T>(
  key: string,
  defaultValue: any = {},
  defaultSubElementValue: any = {},
): DataSource<I, T> => registerDataSource(key, defaultValue, defaultSubElementValue);

const addToList = async (key: string, value: string) => {
  const id = `list:${key}`;
  await client
    .multi()
    .lpush(id, value)
    .expire(id, 60 * 60)
    .exec();
};

const flushList = async (key: string): Promise<string[]> => {
  const id = `list:${key}`;
  const [[err, ret]] = await client.multi().lrange(id, 0, 99).ltrim(id, 100, -1).exec(); // eslint-disable-line no-unused-vars
  return _.reverse(ret || []);
};

module.exports = {
  init,
  newClient,
  set,
  removeFlag,
  hasFlag,
  getTemporary,
  setTemporary,
  removeTemporary,
  setFlag,
  get,
  listenNotifications,
  registerDataSource,
  dataSource,
  broadcast,
  addToList,
  flushList,
};
