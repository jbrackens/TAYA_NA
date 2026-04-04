/* @flow */
const logger = require('gstech-core/modules/logger');
const { actionInactivePlayers } = require('../PlayerActivity');

const run = async () => {
  logger.info(`+++ InactivityActionsJob`);
  await actionInactivePlayers();
};

module.exports = { run };
