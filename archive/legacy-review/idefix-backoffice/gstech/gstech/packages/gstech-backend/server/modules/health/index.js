/* @flow */
const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const healthCheckHandler = async (req: express$Request, res: express$Response) => {
  try {
    await pg.raw('select 1');
    res.json({ ok: true });
  } catch (e) {
    logger.error('Health check failed', e);
    res.status(500);
  }
};

module.exports = {
  apiRoutes: {
    healthCheckHandler,
  },
  routes: {
    healthCheckHandler,
  },
};
