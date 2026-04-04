/* @flow */
const logger = require('gstech-core/modules/logger');
const { notifyInactivePlayers } = require('../PlayerActivity');

const run = async () => {
  logger.info(`+++ InactivityNotificationJob`);
  await notifyInactivePlayers();
};

module.exports = { run };
