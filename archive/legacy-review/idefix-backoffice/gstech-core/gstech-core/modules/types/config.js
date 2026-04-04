/* @flow */
import type { SMSProvider } from '../constants';

export type Configuration<T> = {
  publicKey: string,
  data: T,
};

export type SlackConfiguration = {
  hook: string,
};

export type SMSApiComConfigurationItem = {
  sender: string,
  login: string,
  token: string,
};

export type SMSApiComConfiguration = {
  general: SMSApiComConfigurationItem,
  branded: {
    CJ: SMSApiComConfigurationItem,
    KK: SMSApiComConfigurationItem,
    LD: SMSApiComConfigurationItem,
    OS: SMSApiComConfigurationItem,
  },
};

export type MoreifyConfigurationItem = {
  login: string,
  password: string,
};

export type MoreifyConfiguration = {
  general: MoreifyConfigurationItem,
  branded: {
    CJ: MoreifyConfigurationItem,
    KK: MoreifyConfigurationItem,
    LD: MoreifyConfigurationItem,
    OS: MoreifyConfigurationItem,
  },
};

export type SMSResult = {
  ok: boolean,
  message: string,
  messageId?: string,
};

export type SMSProviderApi = {
  send: (mobilePhone: string, message: string, brandId?: BrandId) => Promise<SMSResult>,
};

export type CoreConfiguration = {
  staticTokens: { [key: BrandId]: string }, // TODO: static tokens should go at some point
  slack: SlackConfiguration,
  smsapicom: SMSApiComConfiguration,
  moreify: MoreifyConfiguration,
};

export type Config = {|
  appName: string,
  env: string,
  isDevelopment: boolean,
  isTest: boolean,
  isProduction: boolean,
  configurationSet: string,
  languages: {
    [branId: BrandId]: { code: string, longCode: string, name: string, engName: string, autoDetect?: boolean }[],
  },
  logger: {
    level: string,
    enabled: boolean,
    server: string,
    port: number,
    facility: string,
  },
  redis: { host: string, port: number }[],
  kafka: { host: string, port: number }[],
  mongoDB: {
    url: string,
  },
  postgres: {
    host: string,
    port: number,
    user: string,
    password: string,
    database: string,
    pool: {
      min: number,
      max: number,
    },
    debug: boolean,
    data: string,
  },
  minio: {
    host: string,
    port: number,
    useSSL: boolean,
    accessKey: string,
    secretKey: string,
  },
  api: {
    backend: { url: string, walletUrl: string, staticTokens: { [key: BrandId]: string } },
    paymentServer: {
      private: string,
    },
    walletServer: {
      private: string,
      public: string,
    },
    rewardServer: {
      private: string,
    },
    campaignServer: {
      public: string,
      private: string,
    },
    affmoreServer: {
      private: string,
    },
  },
  slack: SlackConfiguration,
  sms: {
    defaultProvider: SMSProvider,
    smsapicom: SMSApiComConfiguration,
    moreify: MoreifyConfiguration,
  },
|};
