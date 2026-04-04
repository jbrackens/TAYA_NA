/* @flow */
import type { Configuration, CoreConfiguration, Config } from './types/config';

const fs = require('fs');
const _ = require('lodash');
const moment = require('moment-timezone');
const path = require('path');

const joi = require('./joi');
const validate = require('./validate');
const miserypt = require('./miserypt');

moment.tz.setDefault('Europe/Rome');

const packageFile = fs.readFileSync('package.json', 'utf8');
const packageJson = JSON.parse(packageFile);
const [dbName] = packageJson.name ? packageJson.name.split('-') : ['Integration Test']; // TODO: db name should be full app name.

const envVarsSchema = joi.object({
  NODE_ENV: joi.string()
    .allow(['development', 'test', 'production'])
    .default('development'),
  LOGGER_SERVER: joi.string().default('logger'),
  LOGGER_PORT: joi.number().default(12201),
  LOGGER_FACILITY: joi.string().default(packageJson.name),
  LOGGER_LEVEL: joi.string().allow(['error', 'warn', 'info', 'verbose', 'debug', 'silly'])
    .default(process.env.NODE_ENV === 'test' ? 'disabled' : 'debug'),
  LOGGER_ENABLED: joi.boolean()
    .truthy('TRUE')
    .truthy('true')
    .falsy('FALSE')
    .falsy('false')
    .default(process.env.NODE_ENV === 'production'),
  REDIS_HOST: joi.string().default('127.0.0.1'),
  REDIS_PORT: joi.string().default('7006'),

  KAFKA_ENABLED: joi.boolean().default(false),
  KAFKA_HOST: joi.string().default('127.0.0.1'),
  KAFKA_PORT: joi.string().default('9092'),

  MONGODB_URL: joi.string().optional(),
  MONGODB_HOST: joi.string().default('127.0.0.1'),
  MONGODB_PORT: joi.number().default(27017),
  MONGODB_DATABASE: joi.string().default(dbName),

  POSTGRES_HOST: joi.string().default('127.0.0.1'),
  POSTGRES_PORT: joi.number().default(5432),
  POSTGRES_USER: joi.string().default('root'),
  POSTGRES_PASSWORD: joi.string().default('1234'),
  POSTGRES_DATABASE: joi.string().default(dbName),
  POSTGRES_POOL_MIN: joi.number().default(0),
  POSTGRES_POOL_MAX: joi.number().default(50),
  POSTGRES_DEBUG: joi.boolean()
    .truthy('TRUE')
    .truthy('true')
    .falsy('FALSE')
    .falsy('false')
    .default(false),
  POSTGRES_DATA: joi.string().default('migrations'),

  MINIO_HOST: joi.string().default('127.0.0.1'),
  MINIO_PORT: joi.number().default(9000),
  MINIO_USE_SSL: joi.boolean().default(false),
  MINIO_ACCESS_KEY: joi.string().default('minio'),
  MINIO_SECRET_KEY: joi.string().default('minio123'),

  SMS_PROVIDER: joi.string()
    .allow(['Moreify', 'SmsApiCom'])
    .default('SmsApiCom'),

  BACKEND_URL: joi.string().uri().default('http://localhost:3001'),
  WALLET_URL: joi.string().uri().default('http://localhost:3005/api/v1/wallet'),
  PAYMENT_SERVER_URL: joi.string().uri().default('http://localhost:3007/api/v1'),
  GAME_SERVER_URL: joi.string().uri().default('http://localhost:3004/api/v1'),
  WALLET_SERVER_URL: joi.string().uri().default('http://localhost:3003/api/v1'),
  REWARD_SERVER_URL: joi.string().uri().default('http://localhost:3012/api/v1'),
  CAMPAIGN_SERVER_URL: joi.string().uri().default('http://localhost:3013/api/v1'),
  CAMPAIGN_SERVER_PRIVATE_URL: joi.string().uri().default('http://localhost:3014/api/v1'),
  AFFMORE_SERVER_URL: joi.string().uri().default('http://localhost:3034/api/v1'),
}).unknown().required();

const SECRETS_DIR = '/run/secrets';
const secrets = {};
if (fs.existsSync(SECRETS_DIR) && fs.lstatSync(SECRETS_DIR).isDirectory()) {
  fs.readdirSync(SECRETS_DIR).forEach((file) => {
    secrets[file] = fs.readFileSync(path.join(SECRETS_DIR, file), 'utf8').toString().trim();
  });
}

const envVars = validate({ ...process.env, ...secrets }, envVarsSchema, 'Core config schema validation failed');

const configurationSet = envVars.NODE_ENV === 'production' ? 'real' : 'demo';
const configuration: Configuration<CoreConfiguration> = require(`../config.${configurationSet}.js`);
const coreConfiguration = miserypt.decryptConfig(configuration);

const config: Config = {
  appName: packageJson.name,
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isTest: envVars.NODE_ENV === 'test',
  isProduction: envVars.NODE_ENV === 'production',
  configurationSet,
  languages: {
    KK: [
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English', autoDetect: false },
    ],
    CJ: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'sv', longCode: 'SWE', name: 'Svenska', engName: 'Swedish' },
      { code: 'de', longCode: 'DEU', name: 'Deutsch', engName: 'German' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
    ],
    LD: [
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English' },
      { code: 'fi', longCode: 'FIN', name: 'Suomi', engName: 'Finnish' },
      { code: 'sv', longCode: 'SWE', name: 'Svenska', engName: 'Swedish' },
      { code: 'de', longCode: 'DEU', name: 'Deutsch', engName: 'German' },
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
    ],
    OS: [
      { code: 'no', longCode: 'NOR', name: 'Norsk', engName: 'Norwegian' },
      { code: 'en', longCode: 'ENG', name: 'English', engName: 'English', autoDetect: false },
    ],
  },
  logger: {
    level: envVars.LOGGER_LEVEL,
    enabled: envVars.LOGGER_ENABLED,
    server: envVars.LOGGER_SERVER,
    port: envVars.LOGGER_PORT,
    facility: envVars.LOGGER_FACILITY,
  },
  redis: _.flatten(envVars.REDIS_HOST.split(',').map(host =>
    envVars.REDIS_PORT.split(',').map(port => ({
      host,
      port,
    })))),
  kafka: envVars.KAFKA_ENABLED ? _.flatten(envVars.KAFKA_HOST.split(',').map(host =>
    envVars.KAFKA_PORT.split(',').map(port => ({
      host,
      port,
    })))) : [],
  mongoDB: {
    url: envVars.MONGODB_URL || `mongodb://${envVars.MONGODB_HOST}:${envVars.MONGODB_PORT}/${envVars.MONGODB_DATABASE}`,
  },
  postgres: {
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    user: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
    database: envVars.POSTGRES_DATABASE,
    pool: {
      min: envVars.POSTGRES_POOL_MIN,
      max: envVars.POSTGRES_POOL_MAX,
    },
    debug: envVars.POSTGRES_DEBUG,
    data: envVars.POSTGRES_DATA,
  },
  minio: {
    host: envVars.MINIO_HOST,
    port: envVars.MINIO_PORT,
    useSSL: envVars.MINIO_USE_SSL,
    accessKey: envVars.MINIO_ACCESS_KEY,
    secretKey: envVars.MINIO_SECRET_KEY,
  },
  api: {
    backend: {
      url: envVars.BACKEND_URL,
      walletUrl: envVars.WALLET_URL,
      staticTokens: coreConfiguration.staticTokens,
    },
    paymentServer: {
      private: envVars.PAYMENT_SERVER_URL,
    },
    walletServer: {
      private: envVars.GAME_SERVER_URL,
      public: envVars.WALLET_SERVER_URL,
    },
    rewardServer: {
      private: envVars.REWARD_SERVER_URL,
    },
    campaignServer: {
      public: envVars.CAMPAIGN_SERVER_URL,
      private: envVars.CAMPAIGN_SERVER_PRIVATE_URL,
    },
    affmoreServer: {
      private: envVars.AFFMORE_SERVER_URL,
    },
  },
  slack: coreConfiguration.slack,
  sms: {
    defaultProvider: envVars.SMS_PROVIDER,
    smsapicom: coreConfiguration.smsapicom,
    moreify: coreConfiguration.moreify,
  },
};

module.exports = config;
