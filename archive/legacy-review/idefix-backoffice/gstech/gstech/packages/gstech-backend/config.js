// @flow
import type { Configuration, Config } from 'gstech-core/modules/types/config';
import type { BrandInfo } from 'gstech-core/modules/constants';

const joi = require('gstech-core/modules/joi');
const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const validate = require('gstech-core/modules/validate');
const { brands } = require('gstech-core/modules/constants');
const secrets = require('gstech-core/modules/secrets');

export type BackendConfiguration = {
  userTokenNamespace: UUID,
};

export type BackendConfig = {
  ...Config,
  ...BackendConfiguration,
  affiliateSystem: {
    url: string,
    token: string,
  },
  brands: $ReadOnlyArray<BrandInfo>,
  notifications: { [BrandId]: string },
};

const envVarsSchema = joi.object({
  AFFILIATE_SYSTEM_URL: joi.string().trim().default('http://localhost:4000'),
}).unknown().required();

const envVars: any = validate({ ...process.env, ...secrets }, envVarsSchema, 'Config schema validation failed');

const configuration: Configuration<BackendConfiguration> = require(`./config.${coreConfig.configurationSet}.js`);
const backendConfiguration = miserypt.decryptConfig(configuration);

const parseBrandVars = (base: string): { [BrandId]: string } => {
  const result: { [BrandId]: any } = {};
  brands.forEach(({ id }) => {
    // $FlowFixMe[invalid-computed-prop]
    result[id] = secrets[`${base}_${id}`] || envVars[`${base}_${id}`];
  });
  return result;
};

const notifications: any = parseBrandVars('notifications');

const config: BackendConfig = {
  ...coreConfig,
  ...backendConfiguration,
  affiliateSystem: {
    url: envVars.AFFILIATE_SYSTEM_URL,
    token: envVars.AFFILIATE_SYSTEM_TOKEN,
  },
  brands,
  notifications,
};

module.exports = config;
