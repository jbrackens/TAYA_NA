/* @flow */
const config = require('../config');
const publicRequest = require('../request')('campaignserver api', config.api.campaignServer.public);
const privateRequest = require('../request')(
  'campaignserver api',
  config.api.campaignServer.private,
);

const addContentEvent = async (
  campaignId: Id,
  eventDraft: EventDraft,
): Promise<DataResponse<AddContentEventResponse>> =>
  publicRequest('POST', `/campaigns/${campaignId}/events`, eventDraft);

const getPlayerCampaigns = async (
  playerId: Id,
): Promise<DataResponse<GetPlayerCampaignsResponse>> =>
  publicRequest('GET', `/players/${playerId}/campaigns`);

const getPlayerCampaignsWithRewards = async (
  playerId: Id,
): Promise<DataResponse<GetPlayerCampaignsWithRewardsResponse>> =>
  privateRequest('GET', `/players/${playerId}/campaigns/with-rewards`);

const getPlayerNotifications = async (
  playerId: Id,
): Promise<DataResponse<GetPlayerNotificationsResponse>> =>
  privateRequest('GET', `/players/${playerId}/notifications`);

module.exports = {
  addContentEvent,
  getPlayerCampaigns,
  getPlayerCampaignsWithRewards,
  getPlayerNotifications,
};
