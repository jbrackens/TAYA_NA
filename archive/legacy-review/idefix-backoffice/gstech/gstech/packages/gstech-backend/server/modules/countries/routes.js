/* @flow */
const validate = require('gstech-core/modules/validate');
const logger = require('gstech-core/modules/logger');
const { countrySchema } = require('./schemas');
const Country = require('./Country');

const getCountriesSettings = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId }: { brandId: BrandId } = (req.params: any);
    const countries = await Country.get(brandId);
    return res.status(200).json(countries);
  } catch (err) {
    logger.warn('Get countries settings failed');
    return next(err);
  }
};

const updateCountrySettings = async (
  req: express$Request,
  res: express$Response,
  next: express$NextFunction,
): Promise<mixed> | Promise<express$Response> => {
  try {
    const { brandId, countryId } = req.params;
    const countryDraft = await validate(req.body, countrySchema, 'Update settings failed');
    const country = await Country.update(brandId, countryId, countryDraft);
    return res.status(200).json(country);
  } catch (err) {
    logger.warn('Update settings failed');
    return next(err);
  }
};

module.exports = {
  getCountriesSettings,
  updateCountrySettings,
};
