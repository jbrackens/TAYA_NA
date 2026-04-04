/* @flow */
import type { Reward, Game, CreditType } from '../types/rewards';
import type { Content, Event } from '../types/campaigns';

export type AddContentEventResponse = {
  eventId: Id,
};

export type AddContentEventDraft = {
  text: string,
  contentId: Id,
  extras?: {},
};

export type GetContentListResponse = {
  id: Id,
  location: string,
  contentTypeId: Id,
  name: string,
  content: any,
  externalId: string,
  subtype: string,
  status: 'published' | 'draft',
  updatedAt?: Date,
}[];

export type GetPlayerCampaignsResponse = {
  name: string,
  addedAt: Date,
  removedAt: Date,
  emailSentAt: Date,
  smsSentAt: Date,
  complete: boolean,
}[];

export type CampaignReward = {
  id: Id,
  creditType: CreditType,
  minDeposit: number,
  maxDeposit: number,
  wager: number,
  titles: { [key: string]: { text: string, required?: boolean } },
  quantity: number,
  reward: Reward,
  game?: Game,
};

export type GetPlayerCampaignsWithRewardsResponse = {
  campaignName: string,
  campaignId: Id,
  creditMultiple: boolean,
  rewards: CampaignReward[],
}[];

export type GetPlayerNotificationsResponse = {
  campaignId: string,
  contentId: string,
  name: string,
  externalId: string,
  content: any,
  events: {
    text: string,
    timestamp: Date,
    extras: { ... } | null,
  }[],
}[];

export type GetPlayerSentContent = {
  content: {
    content: Content,
    events: Event[],
    timestamp: Date,
    type: string,
  }[],
  pagination: any,
};

export type SendEmailDirectlyDraft = {
  email: string,
  firstName?: string,
  currencyId: string,
  languageId: string,
  mailerId: string,
  brandId: BrandId,
  link?: string,
  values?: { [key: string]: string | number },
};

export type SubscriptionType = 'all' | 'best_offers' | 'new_games' | 'none';
export type GetPlayerSusbcriptionOptionsResponse = {
  playerId: Id,
  emails: SubscriptionType,
  smses: SubscriptionType,
  emailsSnoozed: boolean,
  smsesSnoozed: boolean,
};

export type UpdatePlayerSubscriptionOptionsDraft =
  | {
      emails: SubscriptionType,
    }
  | {
      smses: SubscriptionType,
    };
export type PlayerIdOrToken = { token: string } | { playerId: Id };
