/* @flow */
const zipObject = require('lodash/fp/zipObject');
const logger = require('gstech-core/modules/logger');
const config = require('../../../config');
const { getCountries } = require('../countries');
const { getLanguages } = require('./Languages');
const { getPaymentProviders } = require('./Payments');
const { getCurrencies } = require('./Currencies');
const { getBaseCountries } = require('./Countries');
const User = require('../users/User');
const { getRiskTypes } = require('../risks');

const getBrandSettings = (brandId: BrandId) => Promise.all([
  getCountries(brandId),
  getLanguages(brandId),
  getCurrencies(brandId),
])
  .then(([countries, languages, currencies]) => ({ countries, languages, currencies }));

const getSettings = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brands } = config;
    const brandIds = brands.map(({ id }) => id);
    const brandsSettingsArray = await Promise.all(brandIds.map(getBrandSettings));
    const risks = await getRiskTypes();
    const roles = await User.getUserRoles(req.userSession.id);
    const paymentProviders = await getPaymentProviders();
    const tasks = risks.map(({ type, title }) => ({
      id: type,
      title,
    }));

    const brandsSettings = zipObject(brandIds, brandsSettingsArray);
    const { isProduction } = config;
    return res.status(200).json({ isProduction, roles, tasks, brands, paymentProviders, brandsSettings });
  } catch (err) {
    logger.warn('Get countries settings failed');
    return next(err);
  }
};

const getCountriesHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const countries = await getBaseCountries();
    return res.status(200).json(countries);
  } catch (err) {
    logger.warn('Get countries settings failed');
    return next(err);
  }
};

const getCurrenciesHandler = async (req: express$Request, res: express$Response, next: express$NextFunction): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const currencies = await getCurrencies(brandId);
    return res.json(currencies);
  } catch (err) {
    logger.warn('Get currencies failed');
    return next(err);
  }
};

module.exports = {
  getSettings,
  getCountriesHandler,
  getCurrenciesHandler,
};
