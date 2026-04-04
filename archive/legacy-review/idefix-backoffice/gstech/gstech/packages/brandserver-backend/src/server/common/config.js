/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { BrandServerConfiguration, BrandServerConfig } from './types';

const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const joi = require('gstech-core/modules/joi');
const validate = require('gstech-core/modules/validate');

const configuration: Configuration<BrandServerConfiguration> = require(`../../../config.${coreConfig.configurationSet}.js`);
const brandServerConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi.object({
  CMS_URL: joi.string().trim().uri().optional(),
}).unknown().required();

const envVars = validate(process.env, envVarsSchema, 'Config schema validation failed');

const config: BrandServerConfig = {
  ...coreConfig,
  ...brandServerConfiguration,
  cmsUrl: envVars.CMS_URL,
};

module.exports = config;
