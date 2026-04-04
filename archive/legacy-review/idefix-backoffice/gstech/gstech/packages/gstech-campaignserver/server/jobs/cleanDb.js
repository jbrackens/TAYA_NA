/* @flow */

const logger = require('gstech-core/modules/logger');

const { cleanDb } = require('../utils');

module.exports = async () => {
  logger.info('cleanDb: starting...');

  await cleanDb();

  logger.info('cleanDb: finished');
};
