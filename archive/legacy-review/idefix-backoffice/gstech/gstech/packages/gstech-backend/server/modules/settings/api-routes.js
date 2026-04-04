/* @flow */
const { getCountries } = require('./Countries');
const { getLanguages } = require('./Languages');
const { getCurrencies } = require('./Currencies');

const getCountriesHandler = async (req: express$Request, res: express$Response) => {
  const { brandId }: { brandId: BrandId } = (req.params: any);
  const countries = await getCountries(brandId);
  res.json(countries);
};

const getLanguagesHandler = async (req: express$Request, res: express$Response) => {
  const { brandId }: { brandId: BrandId } = (req.params: any);
  const countries = await getLanguages(brandId);
  res.json(countries);
};

const getCurrenciesHandler = async (req: express$Request, res: express$Response) => {
  const { brandId }: { brandId: BrandId } = (req.params: any);
  const currencies = await getCurrencies(brandId);
  res.json(currencies);
};

module.exports = {
  getCountriesHandler,
  getLanguagesHandler,
  getCurrenciesHandler,
};
