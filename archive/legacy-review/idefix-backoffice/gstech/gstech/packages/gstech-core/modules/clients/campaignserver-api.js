/* @flow */
import type {
  AddContentEventDraft,
  AddContentEventResponse,
  GetContentListResponse,
  GetPlayerCampaignsResponse,
  GetPlayerCampaignsWithRewardsResponse,
  GetPlayerNotificationsResponse,
  GetPlayerSentContent,
  GetPlayerSusbcriptionOptionsResponse,
  PlayerIdOrToken,
  SendEmailDirectlyDraft,
  UpdatePlayerSubscriptionOptionsDraft,
} from './campaignserver-api-types';

const config = require('../config');
const privateRequest = require('../request')(
  'campaignserver api',
  config.api.campaignServer.private,
);

const doPrivateReq = (
  method: HttpMethod,
  path: string,
  body: mixed,
  queryParams?: { [key: string]: any },
): Promise<any> => {
  const token = config.api.campaignServer.authToken;
  return privateRequest(method, path, body, { 'X-Token': token }, undefined, queryParams);
};

const addContentEvent = async (
  campaignId: Id,
  externalPlayerId: Id,
  eventDraft: AddContentEventDraft,
): Promise<AddContentEventResponse> =>
  doPrivateReq('POST', `/players/${externalPlayerId}/campaigns/${campaignId}/events`, eventDraft);

const getContentList = async (
  brandId: BrandId,
  query: Partial<{
    contentType?: string,
    status?: string,
    location?: string,
    excludeInactive?: boolean,
  }> = {},
): Promise<GetContentListResponse> => doPrivateReq('GET', '/content', { brandId, ...query });

const getPlayerCampaigns = async (externalPlayerId: Id): Promise<GetPlayerCampaignsResponse> =>
  doPrivateReq('GET', `/players/${externalPlayerId}/campaigns`);

const getPlayerCampaignsWithRewards = async (
  externalPlayerId: Id,
): Promise<GetPlayerCampaignsWithRewardsResponse> =>
  doPrivateReq('GET', `/players/${externalPlayerId}/campaigns/with-rewards`);

const getPlayerNotifications = async (
  externalPlayerId: Id,
): Promise<GetPlayerNotificationsResponse> =>
  doPrivateReq('GET', `/players/${externalPlayerId}/notifications`);

const getPlayerSentContent = async (
  externalPlayerId: Id,
  query: { pageSize?: number, pageIndex?: number },
): Promise<GetPlayerSentContent> =>
  doPrivateReq('GET', `/api/v1/players/${externalPlayerId}/content-sent`, query);

const getPlayerSubscriptionOptions = async (
  player: PlayerIdOrToken,
): Promise<GetPlayerSusbcriptionOptionsResponse> =>
  doPrivateReq('GET', '/players/subscription-options', {
    token: player.token && player.token,
    playerId: player.playerId && player.playerId,
  });

const sendEmailDirectly = async (directEmailDraft: SendEmailDirectlyDraft): Promise<OkResult> =>
  doPrivateReq('POST', '/emails/direct-send', directEmailDraft);

const sendEmailForExternalCampaign = async (
  name: string,
  playerId: Id,
  brandId: BrandId,
): Promise<OkResult> => doPrivateReq('POST', `/emails/external-send`, { name, playerId, brandId });

const sendSmsForExternalCampaign = async (
  name: string,
  playerId: Id,
  brandId: BrandId,
): Promise<OkResult> => doPrivateReq('POST', `/smses/external-send`, { name, playerId, brandId });

const snoozePlayerSubscription = async (
  player: PlayerIdOrToken,
  type: 'email' | 'sms',
  revertSnooze: boolean = false,
): Promise<OkResult> =>
  doPrivateReq(
    'POST',
    '/players/subscription-options/snooze',
    { type, revertSnooze },
    {
      token: player.token && player.token,
      playerId: player.playerId && player.playerId,
    },
  );

const updatePlayerSubscriptionOptions = async (
  player: PlayerIdOrToken,
  subscriptionOptionsDraft: UpdatePlayerSubscriptionOptionsDraft,
): Promise<OkResult> =>
  doPrivateReq('PUT', '/players/subscription-options', subscriptionOptionsDraft, {
    token: player.token && player.token,
    playerId: player.playerId && player.playerId,
  });

module.exports = {
  addContentEvent,
  getContentList,
  getPlayerCampaigns,
  getPlayerCampaignsWithRewards,
  getPlayerNotifications,
  getPlayerSentContent,
  getPlayerSubscriptionOptions,
  sendEmailDirectly,
  sendEmailForExternalCampaign,
  sendSmsForExternalCampaign,
  snoozePlayerSubscription,
  updatePlayerSubscriptionOptions,
};
