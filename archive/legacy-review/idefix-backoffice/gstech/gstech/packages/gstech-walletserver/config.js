/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { GameProvidersConfiguration, WalletServerConfig } from './server/types';

const joi = require('gstech-core/modules/joi');
const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');
const validate = require('gstech-core/modules/validate');

const configuration: Configuration<GameProvidersConfiguration> = require(`./config.${coreConfig.configurationSet}.js`);
const providersConfiguration = miserypt.decryptConfig(configuration);

const envVarsSchema = joi.object({
  LOTTO_BACKEND_URL: joi.string().trim().uri().default('http://localhost:3040/api/v1/lottocasino'),
  ENABLE_EVOLUTION_EVENTS: joi.boolean().default(false),
}).unknown().required();

const envVars = validate(process.env, envVarsSchema, 'Config schema validation failed');

const config: WalletServerConfig = {
  ...coreConfig,
  ...providersConfiguration,
  backend: { lottoBackend: envVars.LOTTO_BACKEND_URL },
  enableEvolutionEvents: envVars.ENABLE_EVOLUTION_EVENTS,
};

module.exports = config;
