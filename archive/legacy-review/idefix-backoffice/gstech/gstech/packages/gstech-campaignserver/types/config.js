/* @flow */
import type { Config } from 'gstech-core/modules/types/config';
import type { GoogleApiConfig } from 'gstech-core/modules/sheets';

export type CampaignserverConfiguration = {
  sendGrid: {
    apiKeys: { template: string, send: string, },
    [brandId: BrandId]: {
      templateId: string,
      domain: string,
    },
  },
  contentful: {
    [brandId: BrandId]: {
      preview: {
        accessToken: string,
        host: string,
        space: string,
      },
      delivery: {
        accessToken: string,
        environment_id: string,
        space: string,
      },
    },
  },
  sheets: {
    [brandId: BrandId]: {
      campaigns?: string,
      landingPages: string,
      localizations?: string,
    },
  },
  google: {
    api: GoogleApiConfig,
  },
};

export type CampaignserverConfig = {
  ...CampaignserverConfiguration,
  ...Config,
};
