/* @flow */
import type { Journey } from './api';

const utils = require('./utils');
const datastorage = require('./datastorage');

export type CoinType = 'gold' | 'iron' | 'markka';
export type CampaignType = 'bounty' | 'reward' | 'gold' | 'iron' | 'bonus' | 'wheel' | 'markka' | 'shopitem';

export type CampaignDef = {
  id: string,
  tags: string[],
  mindeposits: number,
  minimumdeposit: number,
  maximumdeposit: number,
  type: CampaignType,
  credit: string,
  action: string,
  [key: string]: {
    title: string,
  }
};

// TODO: this can be removed when jefe campaigns are migrated
const getActiveCampaigns = async (journey: Journey, extraTags?: string[] = []): Promise<CampaignDef[]> => {
  const campaigns = datastorage.campaigns();

  return campaigns.filter((campaign) => {
    const matchTags = utils.matchAllTags(campaign.tags, [...journey.tags, ...extraTags]);
    return matchTags && journey.balance && journey.balance.NumDeposits + 1 > campaign.mindeposits;
  });
};

module.exports = { getActiveCampaigns };
