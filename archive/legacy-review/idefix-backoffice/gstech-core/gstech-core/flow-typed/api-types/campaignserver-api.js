/* @flow */

export type AddContentEventResponse = {|
  eventId: Id,
|};

export type EventDraft = {|
  text: string,
  contentId: Id,
  extras?: {},
|};

export type GetPlayerCampaignsResponse = {
  reward: string,
  minDeposit: Money,
  maxDeposit: Money,
  campaignName: string,
}[];

export type GetPlayerCampaignsWithRewardsResponse = {|
  campaignName: string,
  rewards: {|
    creditMultiple: boolean,
    minDeposit: number,
    maxDeposit: number,
    reward: string,
    wager: number,
    titles: { [key: string]: string },
    quantity: number,
  |}[],
|}[];

export type GetPlayerNotificationsResponse = {|
  campaignId: string,
  contentId: string,
  name: string,
  externalId: string,
  content: {},
  events: {|
    text: string,
    timestamp: Date,
    extras: {} | null,
  |}[],
|}[];
