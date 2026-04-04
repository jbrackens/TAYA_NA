/* @flow */
import type { Configuration, CoreConfiguration, Config } from './types/config';

const fs = require('fs');
const _ = require('lodash');
const moment = require('moment-timezone');

const joi = require('./joi');
const validate = require('./validate');
const miserypt = require('./miserypt');
const secrets = require('./secrets');

moment.tz.setDefault('Europe/Rome');

const packageFile = fs.readFileSync('package.json', 'utf8');
const packageJson = JSON.parse(packageFile);
const [namespace, service] = packageJson.name.split('-');
const dbName = service === 'backend' ? namespace : service;

const isProduction = process.env.NODE_ENV === 'production';
const isLocal = !isProduction && !!process.env.LOGGER_LOCAL;
const configurationSet = isProduction ? 'real' : 'demo';
const configuration: Configuration<CoreConfiguration> = require(`../config.${configurationSet}.js`);
const coreConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi
  .object({
    NODE_ENV: joi.string().trim().valid('development', 'test', 'production').default('development'),
    LOGGER_HOST: joi.string().trim(),
    LOGGER_SERVICE: joi
      .string()
      .trim()
      .default(packageJson.name || 'undefined'),
    LOGGER_LEVEL: joi
      .string()
      .trim()
      .valid('error', 'warn', 'info', 'verbose', 'debug', 'silly')
      .default(process.env.NODE_ENV === 'test' ? 'disabled' : 'debug'),
    LOGGER_FORMAT: joi
      .string()
      .trim()
      .valid('json', 'nice')
      .default(process.env.CI_DEP === 'true' ? 'nice' : 'json'),
    LOGGER_LOCAL: joi.string().trim().optional(),
    REDIS_HOST: joi.string().trim().default('127.0.0.1'),
    REDIS_PORT: joi.string().trim().default('7006'),

    KAFKA_ENABLED: joi.boolean().default(true),
    KAFKA_HOST: joi.string().trim().default('127.0.0.1'),
    KAFKA_PORT: joi.string().trim().default('9092'),
    KAFKA_SSL: joi.boolean().default(false),
    KAFKA_AVRO_REGISTRY_HOST: joi.string().default('127.0.0.1'),
    KAFKA_AVRO_REGISTRY_PORT: joi.string().default('8081'),

    POSTGRES_HOST: joi.string().trim().default('127.0.0.1'),
    POSTGRES_PORT: joi.number().default(5432),
    POSTGRES_USER: joi.string().trim().default('root'),
    POSTGRES_PASSWORD: joi.string().trim().decrypt().default('1234'),
    POSTGRES_DATABASE: joi
      .string()
      .trim()
      .default(dbName || 'undefined'),
    POSTGRES_POOL_SIZE: joi.number().default(20),
    POSTGRES_DEBUG: joi
      .boolean()
      .truthy('TRUE')
      .truthy('true')
      .falsy('FALSE')
      .falsy('false')
      .default(false),
    POSTGRES_CA: joi.string().trim().decrypt(),
    POSTGRES_DATA: joi.string().trim().default('migrations'),

    OPTIMOVE_HOST: joi.string().trim().default('127.0.0.1'),
    OPTIMOVE_PORT: joi.number().default(5432),
    OPTIMOVE_USER: joi.string().trim().default('root'),
    OPTIMOVE_PASSWORD: joi.string().trim().decrypt().default('1234'),
    OPTIMOVE_DATABASE: joi.string().trim().default('optimove'),
    OPTIMOVE_POOL_SIZE: joi.number().default(20),
    OPTIMOVE_DEBUG: joi
      .boolean()
      .truthy('TRUE')
      .truthy('true')
      .falsy('FALSE')
      .falsy('false')
      .default(false),
    OPTIMOVE_CA: joi.string().trim().decrypt(),
    OPTIMOVE_DATA: joi.string().trim().default('migrations'),

    CF_CERTS_URL: joi.string().trim().optional(),
    CF_AUDIENCE_TAG: joi.string().trim().optional(),

    GOOGLE_CLIENT_ID: joi.string().trim().optional(),

    MINIO_HOST: joi.string().trim().default('127.0.0.1'),
    MINIO_PORT: joi.number().default(9000),
    MINIO_USE_SSL: joi.boolean().default(false),
    MINIO_ACCESS_KEY: joi.string().trim().default('minio'),
    MINIO_REGION: joi.string().trim().default('eu-central-1'),
    MINIO_SECRET_KEY: joi.string().trim().decrypt().default('minio123'),
    MINIO_BUCKET_NAME: joi.string().trim().optional().default('docker'),

    SMS_PROVIDER: joi.string().trim().valid('Moreify', 'SmsApiCom', 'Twilio').default('SmsApiCom'),

    MAILER_PROVIDER: joi.string().trim().valid('SendGrid').default('SendGrid'),
    MOCK_MAILER_PORT: joi.number().optional(),

    BACKEND_URL: joi.string().trim().uri().default('http://localhost:3001'),
    WALLET_URL: joi.string().trim().uri().default('http://localhost:3005/api/v1/wallet'),
    PAYMENT_SERVER_URL: joi.string().trim().uri().default('http://localhost:3007/api/v1'),
    GAME_SERVER_URL: joi.string().trim().uri().default('http://localhost:3004/api/v1'),
    WALLET_SERVER_URL: joi.string().trim().uri().default('http://localhost:3003/api/v1'),
    REWARD_SERVER_MANAGEMENT_URL: joi.string().trim().uri().default('http://localhost:3011/api/v1'),
    REWARD_SERVER_URL: joi.string().trim().uri().default('http://localhost:3012/api/v1'),
    REWARD_SERVER_AUTH_TOKEN: joi.string().trim().decrypt(),
    CAMPAIGN_SERVER_URL: joi.string().trim().uri().default('http://localhost:3013/api/v1'),
    CAMPAIGN_SERVER_AUTH_TOKEN: joi.string().trim().decrypt(),
    CAMPAIGN_SERVER_PRIVATE_URL: joi.string().trim().uri().default('http://localhost:3014/api/v1'),
    COMPLIANCE_SERVER_URL: joi.string().trim().uri().default('http://localhost:3009/api/v1'),
    AFFMORE_SERVER_URL: joi.string().trim().uri().default('http://localhost:3034/api/v1'),
    AFFMORE_API_URL: joi.string().trim().uri().default('http://localhost:3033/api/v1'),
    AFFMORE_CLIENT_URL: joi.string().trim().uri().default('http://localhost:3033'),
    IDEFIX_CLIENT_URL: joi.string().trim().uri().default('http://localhost:3000'),
    DD_API_KEY: joi.string().trim().optional(),
    DD_TRACE_AGENT_HOSTNAME: joi.string().trim().optional(),
    DD_SERVICE_NAME: joi.string().trim().optional(),

    CMS_URL: joi.string().trim().uri().optional(),
  })
  .unknown()
  .required();

const envVars = validate<Object>({ ...process.env, ...secrets }, envVarsSchema, 'Core config schema validation failed');

const config: Config = {
  publicKey: configuration.publicKey,
  appName: packageJson.name,
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  isLocal,
  isProduction,
  configurationSet,
  languages: {
    KK: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
    ],
    CJ: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'sv', longCode: 'SWE', name: 'Svenska', engName: 'Swedish', override: 'en' },
      { code: 'de', longCode: 'DEU', name: 'Deutsch', engName: 'German' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
      { code: 'fr', longCode: 'FRA', name: 'Français', engName: 'French' },
      { code: 'es', longCode: 'ESP', name: 'Español', engName: 'Spanish' },
    ],
    LD: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'sv', longCode: 'SWE', name: 'Svenska', engName: 'Swedish', override: 'en' },
      { code: 'de', longCode: 'DEU', name: 'Deutsch', engName: 'German' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
      { code: 'fr', longCode: 'FRA', name: 'Français', engName: 'French' },
    ],
    OS: [
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English', autoDetect: false },
    ],
    FK: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
    ],
    SN: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'es', longCode: 'ESP', name: 'Español', engName: 'Spanish' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
    ],
    VB: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'es', longCode: 'ESP', name: 'Español', engName: 'Spanish' },
      { code: 'pt', longCode: 'POR', name: 'Português', engName: 'Portuguese' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
    ],
  },
  logger: {
    level: envVars.LOGGER_LEVEL,
    format: envVars.LOGGER_FORMAT,
    local: envVars.LOGGER_LOCAL,
    service: envVars.LOGGER_SERVICE
  },
  redis: _.flatten(envVars.REDIS_HOST.split(',').map(host =>
    envVars.REDIS_PORT.split(',').map(port => ({
      host,
      port,
    })))),
  kafka: envVars.KAFKA_ENABLED ? {
    brokers: _.flatten(envVars.KAFKA_HOST.split(',').map(host =>
      envVars.KAFKA_PORT.split(',').map(port => ({
        host,
        port,
      })))),
    ssl: envVars.KAFKA_SSL,
    registry: {
      host: envVars.KAFKA_AVRO_REGISTRY_HOST,
      port: envVars.KAFKA_AVRO_REGISTRY_PORT,
    }
  } : undefined,
  postgres: {
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    user: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
    database: envVars.POSTGRES_DATABASE || dbName,
    debug: envVars.POSTGRES_DEBUG,
    pool: { min: 0, max: envVars.POSTGRES_POOL_SIZE },
    data: envVars.POSTGRES_DATA,
    ca: envVars.POSTGRES_CA,
  },
  optimove: {
    host: envVars.OPTIMOVE_HOST,
    port: envVars.OPTIMOVE_PORT,
    user: envVars.OPTIMOVE_USER,
    password: envVars.OPTIMOVE_PASSWORD,
    database: envVars.OPTIMOVE_DATABASE,
    debug: envVars.OPTIMOVE_DEBUG,
    pool: { min: 0, max: envVars.OPTIMOVE_POOL_SIZE },
    data: envVars.OPTIMOVE_DATA,
    ca: envVars.OPTIMOVE_CA,
  },
  cloudflareCertUrl: envVars.CF_CERTS_URL,
  cloudflareAudienceTag: envVars.CF_AUDIENCE_TAG,
  googleClientID: envVars.GOOGLE_CLIENT_ID,
  minio: {
    host: envVars.MINIO_HOST,
    port: envVars.MINIO_PORT,
    useSSL: envVars.MINIO_USE_SSL,
    accessKey: envVars.MINIO_ACCESS_KEY,
    region: envVars.MINIO_REGION,
    secretKey: envVars.MINIO_SECRET_KEY,
    bucketName: envVars.MINIO_BUCKET_NAME,
  },
  api: {
    backend: {
      url: envVars.BACKEND_URL,
      walletUrl: envVars.WALLET_URL,
      staticTokens: isProduction ? coreConfiguration.staticTokens : {},
    },
    paymentServer: {
      private: envVars.PAYMENT_SERVER_URL,
    },
    walletServer: {
      private: envVars.GAME_SERVER_URL,
      public: envVars.WALLET_SERVER_URL,
    },
    rewardServer: {
      management: envVars.REWARD_SERVER_MANAGEMENT_URL,
      private: envVars.REWARD_SERVER_URL,
      authToken: envVars.REWARD_SERVER_AUTH_TOKEN,
    },
    campaignServer: {
      public: envVars.CAMPAIGN_SERVER_URL,
      private: envVars.CAMPAIGN_SERVER_PRIVATE_URL,
      authToken: envVars.CAMPAIGN_SERVER_AUTH_TOKEN,
    },
    complianceServer: {
      private: envVars.COMPLIANCE_SERVER_URL,
    },
    affmoreServer: {
      public: envVars.AFFMORE_API_URL,
      private: envVars.AFFMORE_SERVER_URL,
    },
  },
  ui: {
    idefix: envVars.IDEFIX_CLIENT_URL,
    affmore: envVars.AFFMORE_CLIENT_URL,
  },
  slack: coreConfiguration.slack,
  sms: {
    defaultProvider: envVars.SMS_PROVIDER,
    smsapicom: coreConfiguration.smsapicom,
    moreify: coreConfiguration.moreify,
    twilio: coreConfiguration.twilio,
  },
  mailer: {
    defaultProvider: envVars.MAILER_PROVIDER,
    mockMailerPort: isLocal ? envVars.MOCK_MAILER_PORT : null,
    sendGrid: coreConfiguration.sendGrid,
  },
  loki: envVars.LOGGER_HOST && {
    host: envVars.LOGGER_HOST,
  },
  datadog: envVars.DD_API_KEY && {
    apiKey: envVars.DD_API_KEY,
    hostname: envVars.DD_TRACE_AGENT_HOSTNAME,
    serviceName: envVars.DD_SERVICE_NAME,
  },
};

module.exports = config;
