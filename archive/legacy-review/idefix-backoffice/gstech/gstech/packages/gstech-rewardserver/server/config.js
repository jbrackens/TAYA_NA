/* @flow */

import type { Configuration } from 'gstech-core/modules/types/config';
import type { RewardserverConfig } from '../types/config';

const coreConfig = require('gstech-core/modules/config');
const miserypt = require('gstech-core/modules/miserypt');

const configuration: Configuration<RewardserverConfig> = require(`../config.${coreConfig.configurationSet}.js`);
const customConfiguration = miserypt.decryptConfig(configuration);

const config: RewardserverConfig = {
  ...coreConfig,
  ...customConfiguration,
};

module.exports = config;
