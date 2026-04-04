/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { PaymentProvidersConfiguration, PaymentServerConfig } from './server/types';

const joi = require('gstech-core/modules/joi');
const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const validate = require('gstech-core/modules/validate');

const configuration: Configuration<PaymentProvidersConfiguration> = require(`./config.${coreConfig.configurationSet}.js`);
const providersConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi.object({
  PUBLIC_URL: joi.string().trim().uri().default('http://localhost:3006'),
  PRIVATE_URL: joi.string().trim().uri().default('http://localhost:3007'),
}).unknown().required();

const envVars = validate(process.env, envVarsSchema, 'Config schema validation failed');

const config: PaymentServerConfig = {
  ...coreConfig,
  ...providersConfiguration,
  server: {
    public: envVars.PUBLIC_URL,
    private: envVars.PRIVATE_URL, // TODO: this one is rather temporary. Used in register integration tests only. should be be replaced with gstech-backend call.
  },
};

module.exports = config;
