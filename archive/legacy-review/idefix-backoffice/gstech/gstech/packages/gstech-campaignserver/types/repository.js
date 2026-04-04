/* @flow */
import type { Campaign, CampaignGroup } from './common';

export type PlayerCorrespondenceInfo = {
  campaignPlayerId: Id,
  id: Id,
  currencyId: string,
  languageId: string,
  firstName: string,
  email?: string,
  mobilePhone?: string,
};

export type CampaignsList = {
  groups: {
    ...CampaignGroup,
    campaigns: {
      ...Campaign,
      audience: number,
      reactions: number,
    }[],
  }[],
  pagination?: {},
};
