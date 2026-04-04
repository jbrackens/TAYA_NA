/* @flow */
const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const PlayerPin = require("../PlayerPin");

const run = async () => {
  const deleted = await PlayerPin.deleteExpired(pg);
  logger.info(`DeleteExpiredPinsJob. '${deleted}' pin codes deleted.`);
};

module.exports = { run };
