/* @flow */
import type { Config } from 'gstech-core/modules/types/config';

export type PlayerBlockedResult = { // TODO: this should go to compliance server api client (core)
  nationalId: string,
  isBlocked: boolean,
};

export type ComplianceProviderApi = {
  checkPlayer(nationalId: string): Promise<PlayerBlockedResult>,
};

export type ComplianceServerModule = {
  api: ComplianceProviderApi,
};

export type ComplianceProvidersConfiguration = {
  providers: {
    spelpaus: {
      url: string,
      actorId: string,
      apiKey: string,
    },
  },
  emailCheck: {
    apiKey: string,
  },
};

export type ComplianceServerConfig = {
  ...ComplianceProvidersConfiguration,
  ...Config,
};
