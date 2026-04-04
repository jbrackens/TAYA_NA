/* @flow */
import type { EventWithoutFK } from './common';

export type GetCampaignsWithRewards = {
  campaignId: Id,
  name: string,
  rewardIds: Id[],
}[];

export type GetPlayerAvailableContentResponse = {
  events: EventWithoutFK[],
  id: Id,
  name: string,
  content: {},
}[];

export type GetPlayerSubscriptionOptionsResponse = {
  email?: string,
  playerId: Id,
  emails: string,
  smses: string,
  emailsSnoozed: boolean,
  smsesSnoozed: boolean,
};

export type GetCountries = {
  brandId: BrandId,
  code: string,
  name: string,
}[];

export type GetCampaignStats = {
  audience: number,
  emailAudience: number,
  smsAudience: number,
};
