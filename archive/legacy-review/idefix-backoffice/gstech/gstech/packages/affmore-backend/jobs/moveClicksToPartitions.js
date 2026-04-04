// @flow
require('flow-remove-types/register');

const pg = require('gstech-core/modules/pg');

const logger = require("gstech-core/modules/logger");
const operations = require("../server/operations");

module.exports = async () => {
  logger.info('moveClicksToPartitions: starting...');

  try {
    await operations.moveClicksToPartitions(pg);
  } catch (e) {
    logger.error(`Error occurred.`, e);
  }

  logger.info('moveClicksToPartitions: Completed.');
};
