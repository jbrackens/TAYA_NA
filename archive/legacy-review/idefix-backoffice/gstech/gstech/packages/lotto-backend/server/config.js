/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { LottoProvidersConfiguration, LottoBackendConfig } from './types';

const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');

const configuration: Configuration<LottoProvidersConfiguration> = require(`../config.${coreConfig.configurationSet}.js`);
const providersConfiguration = miserypt.decryptConfig(configuration);

const config: LottoBackendConfig = {
  ...coreConfig,
  ...providersConfiguration,
};

module.exports = config;
