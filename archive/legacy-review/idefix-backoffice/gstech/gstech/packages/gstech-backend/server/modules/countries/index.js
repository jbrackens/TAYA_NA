/* @flow */
const Country = require('./Country');
const { getCountriesSettings, updateCountrySettings } = require('./routes');

module.exports = {
  getCountries: Country.get,
  findCountry: Country.find,
  routes: {
    getCountriesSettingsHandler: getCountriesSettings,
    updateCountrySettingsHandler: updateCountrySettings,
  },
};
