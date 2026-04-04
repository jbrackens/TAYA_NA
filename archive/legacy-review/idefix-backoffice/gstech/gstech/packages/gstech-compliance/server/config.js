/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { ComplianceProvidersConfiguration, ComplianceServerConfig } from './types';

const joi = require('gstech-core/modules/joi');
const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const validate = require('gstech-core/modules/validate');

const configuration: Configuration<ComplianceProvidersConfiguration> = require(`../config.${coreConfig.configurationSet}.js`);
const complianceConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi.object({
  // SOME_PROP: joi.string().trim().required(),
}).unknown().required();

// eslint-disable-next-line no-unused-vars
const envVars = validate(process.env, envVarsSchema, 'Config schema validation failed');

const config: ComplianceServerConfig = {
  ...coreConfig,
  ...complianceConfiguration,
  // someProperty: envVars.SOME_PROP,
};

module.exports = config;
