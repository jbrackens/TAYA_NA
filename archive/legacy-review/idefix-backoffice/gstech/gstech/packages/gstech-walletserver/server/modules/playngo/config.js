/* @flow */
import type { GameProvider } from "gstech-core/modules/constants";
import type { PlayngoEnvironment } from '../../types';

const first = require('lodash/fp/first');
const config = require('../../../config');

const configuration = config.providers.playngo;

/* eslint-disable no-unused-vars */
// No other rules so far
const getConfiguration = ({
  countryId,
  brandId,
  currencyId,
}: {
  countryId: string,
  brandId: BrandId,
  currencyId: string,
  ...
}): PlayngoEnvironment => first(configuration.environments);

const getDefaultConfiguration = (): {
  accessToken: string,
  api: { auth: { password: string, user: string, ... }, endpoint: string, ... },
  desktopLaunch: string,
  manufacturerId: GameProvider,
  mobileLaunch: string,
  pid: number,
} => first(configuration.environments);

module.exports = { getConfiguration, getDefaultConfiguration };
