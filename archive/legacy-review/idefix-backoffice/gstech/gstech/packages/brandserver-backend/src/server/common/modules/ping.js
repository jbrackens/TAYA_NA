/* @flow */
const logger = require('../logger');
const api = require('../api');
const redis = require('../redis');
const configuration = require('../configuration');

const pingRedis = async () => {
  const l = new Date().getTime();
  await redis.setTemporary('ping', '', true);
  return new Date().getTime() - l;
};

const operationTime = async (c: Promise<any>) => {
  const start = Date.now();
  try {
    const result = await c;
    const duration = Date.now() - start;
    return { duration, result };
  } catch (e) {
    logger.warn('operationTime failed', e);
    const duration = Date.now() - start;
    return { duration, result: 'failed' };
  }
};

const status = () => Promise.all([configuration.project(), api.PingGetServiceHealth(), pingRedis()].map(operationTime)).then(([project, api, db, rd]) => ({ project, api, db, rd }));

const statusHandler = async (req: express$Request, res: express$Response): Promise<express$Response> => {
  try {
    const r = await status();
    return res.json(r);
  } catch (e) {
    logger.warn('Status failed', e);
    return res.sendStatus(504);
  }
};

const pingHandler = (req: express$Request, res: express$Response) => {
  res.json({ ok: true });
};

module.exports = { statusHandler, pingHandler };

if (process.env.LD_ENV !== 'worker') {
  logger.info('Periodically pinging backend');
  setInterval(() => api.PingGetServiceHealth(), 30000);
}
