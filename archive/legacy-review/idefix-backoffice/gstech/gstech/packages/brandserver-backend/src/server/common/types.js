/* @flow */
import type { Config, CommChannelConfig } from 'gstech-core/modules/types/config';
import type { GoogleApiConfig } from 'gstech-core/modules/sheets';

export type BrandServerConfiguration = {
  signUpVerificationChannel: CommChannelConfig,
  resetPasswdVerificationChannel: CommChannelConfig,
  google: {
    api: GoogleApiConfig,
    sso: {
      account: string,
      password: string,
      domain: string,
    },
    reCaptchas: {
      [key: BrandId]: {
        siteKey: string,
        secretKey: string,
      },
    },
  },
  contentful: {
    [key: BrandId]: {
      space: string,
      accessToken: string,
      environment_id: string,
    },
  },
  adminUiToken: string,
  cmsUrl?: string,
};

export type BrandServerConfig = { ...BrandServerConfiguration, ...Config };
