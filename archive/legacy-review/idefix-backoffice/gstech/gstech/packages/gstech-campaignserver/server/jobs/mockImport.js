/* @flow */

const path = require('path');
const fs = require('fs-extra');

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');


module.exports = async () => {
  logger.info('mockImport: starting...');

  try {
    const file = await fs.readFile(path.join(__dirname, '/campaignserver.sql'));
    await pg.raw(file.toString());
  } catch (e) {
    logger.info('mockImport: fail.', e);
  }

  logger.info('mockImport: finished.');
};
