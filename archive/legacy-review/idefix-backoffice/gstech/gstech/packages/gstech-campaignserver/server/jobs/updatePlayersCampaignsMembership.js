/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const { updatePlayersCampaignsMembership } = require('../modules/Campaigns/repository');

module.exports = async () => {
  logger.info('updatePlayersCampaignsMembership: starting...');
  await updatePlayersCampaignsMembership(pg);
  logger.info('updatePlayersCampaignsMembership: finished.');
};
