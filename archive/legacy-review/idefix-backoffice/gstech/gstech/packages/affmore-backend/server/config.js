/* @flow */
import type { Config, Configuration } from 'gstech-core/modules/types/config';

export type AffmoreConfiguration = {
  sftpCfg: {
    host: string,
    port: number,
    username: string,
    password: string,
    brandSuffix: string,
    folderReg: string,
    folderSales: string,
    enabled?: boolean,
    onBootEnabled?: boolean,
  },
};

export type AffmoreServerConfig = {
  affiliateAuthSecret: string,
  userAuthSecret: string,
  tcVersion: number,
  ...AffmoreConfiguration,
  ...Config,
};

const joi = require('gstech-core/modules/joi');
const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const validate = require('gstech-core/modules/validate');

const configuration: Configuration<AffmoreConfiguration> = require(`../config.${coreConfig.configurationSet}.js`);
const affmoreConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi.object({
  AFFILIATE_AUTH_SECRET: joi.devDefault('dummy_secret'),
  USER_AUTH_SECRET: joi.devDefault('secret_dummy'),
  TC_VERSION: joi.number().default(0),
}).unknown().required();

const envVars = validate(process.env, envVarsSchema, 'Config schema validation failed');

const { minio, minio: { bucketName = 'affmore-log-attachments' } } = coreConfig;
const config: AffmoreServerConfig = {
  ...coreConfig,
  ...affmoreConfiguration,
  affiliateAuthSecret: envVars.AFFILIATE_AUTH_SECRET,
  userAuthSecret: envVars.USER_AUTH_SECRET,
  tcVersion: envVars.TC_VERSION,
  minio: { ...minio, bucketName },
};

module.exports = config;
