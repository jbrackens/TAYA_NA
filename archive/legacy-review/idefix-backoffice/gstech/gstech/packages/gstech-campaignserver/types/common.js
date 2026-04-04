/* @flow */
import type { Content, ContentDraft, Event } from 'gstech-core/modules/types/campaigns';
import type { Operator } from './queryBuilder';

export type AudienceRuleDraft = {
  name: string,
  operator: Operator,
  values: any,
  not?: boolean,
};

export type AudienceRule = { id: Id, ...AudienceRuleDraft };

export type AudienceRuleDraftUpdate = Partial<AudienceRuleDraft>;

export type PlayerCampaignsWithRewards = {
  campaignName: string,
  creditMultiple: boolean,
  campaignId: Id,
  // eslint-disable-next-line no-use-before-define
  rewards: $Diff<RewardRule, { trigger: string, removedAt?: ?Date, rewardId: Id }>[],
}[];

export type PlayerNotificationsWithEvents = {
  campaignId: string,
  contentId: string,
  name: string,
  externalId: string,
  content: {},
  events: {
    text: string,
    timestamp: Date,
    extras: {} | null,
  }[],
}[];

export type AudienceType = 'dynamic' | 'static';
export type CampaignStatus = 'draft' | 'active' | 'running' | 'archived';

export type CampaignDraft = {
  brandId: BrandId,
  name: string,
  startTime?: ?Date,
  endTime?: ?Date,
  status: CampaignStatus,
  audienceType: AudienceType,
  creditMultiple?: boolean,
  previewMode?: boolean,
  migrated?: boolean,
  groupId?: ?number,
};

export type Campaign = { id: Id, ...CampaignDraft };

export type CampaignWithAudienceRules = { audienceRules: AudienceRule[], ...Campaign };

export type CampaignContentDraft = {
  campaignId: Id,
  contentId: Id,
  contentTypeId: Id,
  sendingTime?: string,
  removedAt?: Date,
};

export type CampaignContent = { id: Id, ...CampaignContentDraft };

export type CampaignContentCreate = {
  contentId: Id,
  sendingTime?: string,
  sendToAll?: boolean,
};

export type CampaignPlayerDraft = {
  campaignId: number,
  playerId: number,
  addedAt: Date,
  removedAt: Date,
  emailSentAt?: Date,
  smsSentAt?: Date,
  complete?: boolean,
};

export type CampaignPlayer = { id: Id, ...CampaignPlayerDraft };

export type CampaignUpdate = {
  brandId?: BrandId,
  name?: string,
  startTime?: Date,
  endTime?: Date,
  status?: CampaignStatus,
  audienceType?: AudienceType,
  previewMode?: boolean,
  groupId?: Id
};

export type DepositDraft = {
  externalPlayerId: Id,
  paymentId: Id,
  timestamp: Date,
  amount: Money,
  convertedAmount: Money,
  perPlayerCount: number,
};

export type Deposit = { id: Id, ...DepositDraft };

export type RewardRulesTrigger = 'deposit' | 'registration' | 'login' | 'instant';

export type RewardRuleDraft = {
  trigger: RewardRulesTrigger,
  minDeposit?: ?number,
  maxDeposit?: ?number,
  rewardId: Id,
  wager: number,
  useOnCredit: boolean,
  quantity: number,
  titles: {
    [lang: string]: {
      text: string,
      required?: boolean,
    },
  },
  removedAt?: ?Date,
};

export type RewardRule = { id: Id, campaignId: Id, ...RewardRuleDraft };

export type ContentUpdate = Partial<ContentDraft>;
export type ContentWithLocation = { location: string, ...Content };
export type ContentCreationDraft = {
  name: string,
  content: any,
  externalId: string,
  subtype: string,
  active: boolean,

  location?: string,
  brandId: BrandId,
  type: string,
};

export type EventWithoutFK = {
  text: string,
  timestamp: Date,
};

export type ContentWithEvents = {
  content: Content,
  events: Event[],
  timestamp: Date,
  type: string,
};

export type CreateEventDraft = {
  campaignContentId?: number,
  campaignId?: number,
  contentId?: number,
  playerId?: number,
  externalPlayerId?: number,
  text: string,
  extras?: { ... },
};

export type NotificationPlayerInfo = {
  firstName: string,
  currencyId: string,
  languageId: string,
};

export type EmailPlayerInfo = {
  id?: Id,
  brandId?: BrandId,
  email?: string,
  campaignPlayerId?: Id,
  ...NotificationPlayerInfo,
};

export type SMSPlayerInfo = {
  id?: Id,
  firstName: string,
  currencyId: string,
  languageId?: string,
};

export type RenderOptions =
  | {
      renderDraft?: boolean,
      brandId?: BrandId,
      link?: string,
      values?: { [string]: string },
    }
  | {};

export type CountryDraft = {
  brandId: BrandId,
  code: string,
  name: string,
  minimumAge: number,
  blocked: boolean,
  registrationAllowed: boolean,
};

export type Country = { id: Id, ...CountryDraft };

export type CampaignContentType = 'email' | 'sms' | 'notification' | 'landingPage' | 'banner';

type CampaignStatsResultArray = Array<{
  id: string,
  name: string,
  value: number,
}>;
export type CampaignStats = {
  [key: 'audience' | 'email' | 'sms' | 'notification']: CampaignStatsResultArray,
  reward: {
    general: CampaignStatsResultArray,
    rewards: { [rewardRuleId: Id]: CampaignStatsResultArray },
  },
};

export type CompleteCampaign = {
  audience: {
    rules: { id: Id, name: string, operator: string, values: any, not: boolean }[],
  },
  reward: { rewards: $Diff<RewardRule, { removedAt?: ?Date }>[] },
  email: {
    emailId: Id,
    contentId: Id,
    name: string,
    subject: string,
    sendingTime: string,
  },
  sms: {
    smsId: Id,
    contentId: Id,
    name: string,
    text: string,
    sendingTime: string,
  },
  notification: {
    notificationId: Id,
    contentId: Id,
    name: string,
    title: string,
  },
  group: {
    name: string,
    campaigns: {
      id: Id,
      name: string,
    }[]
  },
  ...Campaign,
};

export type CampaignGroup = {
  id: Id,
  name: string,
};
