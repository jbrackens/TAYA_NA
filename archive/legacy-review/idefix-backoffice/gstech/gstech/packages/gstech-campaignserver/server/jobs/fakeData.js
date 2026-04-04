/* @flow */

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');

const mockData = require('../mockData');

module.exports = async () => {
  logger.info('fakeData: starting...');

  try {
    await pg('content_type').insert(mockData.contentType);
    await pg('content').insert(mockData.content);
    await pg('countries').insert(mockData.countries);
    await pg('players').insert(mockData.players);
    await pg('campaign_groups').insert(mockData.campaignGroups);
    await pg('campaigns').insert(mockData.campaigns);
    await pg('reward_rules').insert(mockData.rewardRules);
    await pg('campaigns_content').insert(mockData.campaignsContent);
    await pg('audience_rules').insert(mockData.audienceRules.map(r => ({ ...r, campaignId: 1 })));
    await pg('campaigns_players').insert(mockData.campaignsPlayers);
    await pg('deposits').insert(mockData.deposits);
    await pg('events').insert(mockData.events);
  } catch (e) {
    logger.info('fakeData: fail.', e);
  }

  logger.info('fakeData: finished.');
};
