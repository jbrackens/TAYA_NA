/* @flow */
import type { SMSProvider, MailerProvider, SMSAction } from '../constants';

export type CommChannelMethodBase = 'email' | 'sms';
export type CommChannelMethodWithFallback = 'email>sms' | 'sms>email';
export type CommChannelMethod = CommChannelMethodBase | CommChannelMethodWithFallback;
export type CommChannelConfig =
  | CommChannelMethod
  | {
      default: CommChannelMethod,
      countries?: { [key: string]: CommChannelMethod },
    };
export type ParsedCommChannelConfig = { primary: CommChannelMethodBase, fallback?: ?CommChannelMethodBase }

export type Configuration<T> = {
  publicKey: string,
  data: T,
};

export type SlackConfiguration = {
  hook: string,
};

export type PostgresConfiguration = {
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
  ca: ?string,
};

export type SMSProvidersBaseConfigs = {
  Moreify: {},
  SmsApiCom: { oauthToken: string },
  Twilio: { accountSid: string, authToken: string },
};

type SMSProvidersBaseConfigItems = {
  SmsApiCom: { sender: string, oauthToken?: string },
  Moreify: { login: string, password: string },
  Twilio: { name: string, sid: string },
};

export type SMSProvidersConfigItem = {
  [key in keyof SMSProvidersBaseConfigItems]: {
    ...SMSProvidersBaseConfigItems[key],
    senderOverride?: { [country: string]: string },
  },
};

export type SMSProvidersConfiguration<T: $Keys<SMSProvidersBaseConfigs>> = {
  ...SMSProvidersBaseConfigs[T],
  defaults: {
    general: SMSProvidersConfigItem[T],
    [brandId: BrandId]: SMSProvidersConfigItem[T],
  },
};

export type SMSActionsConfigurations<T: $Keys<SMSProvidersBaseConfigs>> = {
  ...SMSProvidersConfiguration<T>,
  actions?: {
    [key: SMSAction]: {
      [key in keyof SMSProvidersConfiguration<T>['defaults']]: Partial<
        SMSProvidersConfiguration<T>['defaults'][key],>,
    },
  },
};

export type SendGridConfiguration = {
  token: string,
};

export type SMSResult = {
  ok: boolean,
  message: string,
  messageId?: string,
};

export type MailOptions = {
  customArgs?: { [key: string]: any },
  replyTo?: string,
  subject: string,
  from: string,
  to: string,
  ['html' | 'text']: string,
  categories?: string[],
};

export type SMSProviderApi = {
  send: (
    mobilePhone: string,
    message: string,
    brandId?: BrandId,
    action?: SMSAction,
  ) => Promise<SMSResult>,
  determineSender?: (mobilePhone: string, brandId?: BrandId, action?: SMSAction) => string,
};

export type MailProviderApi = {
  sendMail: (opts: MailOptions) => Promise<void>,
};

export type CoreConfiguration = {
  staticTokens: { [key: BrandId]: string }, // TODO: static tokens should go at some point
  slack: SlackConfiguration,
  sendGrid: SendGridConfiguration,
  smsapicom: SMSActionsConfigurations<'SmsApiCom'>,
  moreify: SMSActionsConfigurations<'Moreify'>,
  twilio: SMSActionsConfigurations<'Twilio'>,
};

export type Config = {
  publicKey: string,
  appName: string,
  env: string,
  isDevelopment: boolean,
  isTest: boolean,
  isProduction: boolean,
  isLocal: boolean,
  configurationSet: string,
  languages: {
    [key: BrandId]: {
      code: string,
      longCode: string,
      name: string,
      engName: string,
      autoDetect?: boolean,
      override?: string,
    }[],
  },
  logger: {
    level: string,
    format: 'json' | 'nice',
    service: string,
    local: ?string,
  },
  redis: { host: string, port: number }[],
  kafka: ?{
    brokers: { host: string, port: number }[],
    ssl: boolean,
    registry: { host: string, port: number },
  },
  postgres: PostgresConfiguration,
  optimove: PostgresConfiguration,
  cloudflareCertUrl: string,
  cloudflareAudienceTag: string,
  googleClientID: string,
  minio: {
    host: string,
    port: number,
    useSSL: boolean,
    accessKey: string,
    secretKey: string,
    bucketName?: string,
    region: string,
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
      management: string,
      private: string,
      authToken: string,
    },
    campaignServer: {
      public: string,
      private: string,
      authToken: string,
    },
    complianceServer: {
      private: string,
    },
    affmoreServer: {
      public: string,
      private: string,
    },
  },
  ui: {
    idefix: string,
    affmore: string,
  },
  slack: SlackConfiguration,
  sms: {
    defaultProvider: SMSProvider,
    smsapicom: SMSActionsConfigurations<'SmsApiCom'>,
    moreify: SMSActionsConfigurations<'Moreify'>,
    twilio: SMSActionsConfigurations<'Twilio'>,
  },
  mailer: {
    defaultProvider: MailerProvider,
    mockMailerPort: ?number,
    sendGrid: SendGridConfiguration,
  },
  loki?: {
    host: string,
  },
  datadog?: {
    apiKey: string,
    hostname: string,
    serviceName: string,
  },
};
