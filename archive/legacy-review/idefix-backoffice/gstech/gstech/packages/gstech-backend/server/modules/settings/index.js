/* @flow */
import type { BrandInfo } from 'gstech-core/modules/constants';

const apiRoutes = require('./api-routes');
const routes = require('./routes');
const ConversionRates = require('./ConversionRates');
const Whitelist = require('./Whitelist');
const Brands = require('./Brands');
const config = require('../../../config');

module.exports = {
  getMonthRates: ConversionRates.getMonthRates,
  getAllMonthRates: ConversionRates.getAllMonthRates,
  getCurrentRates: ConversionRates.getCurrentRates,
  getBrandInfo: Brands.getInfo,
  settings: (): {brands: $ReadOnlyArray<BrandInfo>} => ({ brands: config.brands }),
  isWhitelistedIp: Whitelist.check,
  apiRoutes: {
    countriesHandler: apiRoutes.getCountriesHandler,
    languagesHandler: apiRoutes.getLanguagesHandler,
    currenciesHandler: apiRoutes.getCurrenciesHandler,
  },
  routes: {
    getSettingsHandler: routes.getSettings,
    getCurrenciesHandler: routes.getCurrenciesHandler,
    getCountriesHandler: routes.getCountriesHandler,
  },
};
