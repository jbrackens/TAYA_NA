/* @flow */
const api = require('../api');
const repository = require('../repository');

let _countries = null;
let _currencies = null;
let _blockedCountries = null;

const mapCountryToCurrency = (
  country: {
    Blocked: boolean,
    CountryISO: string,
    CountryName: string,
    Registrations: boolean,
    ...
  },
) => {
  const CurrencyISO = repository.countryToCurrency(country.CountryISO);
  return {
    CurrencyISO,
    CountryName: country.CountryName,
    CountryISO: country.CountryISO,
  };
};


const fetchCountries = async () => {
  if (_countries == null || _blockedCountries == null) {
    const x: { Blocked: boolean, Registrations: boolean, CountryISO: string, CountryName: string }[] = await api.CountriesGetAll();
    _countries = x.filter(z => z.Registrations).map(mapCountryToCurrency);
    _blockedCountries = x.filter(z => z.Blocked).map(c => c.CountryISO);
  }
};

export type MemoedCountriesResponse = Array<{
  CurrencyISO: string,
  CountryName: string,
  CountryISO: string,
}>;
const getCountries = async (): Promise<?MemoedCountriesResponse> => {
  await fetchCountries();
  return _countries;
};

const getBlockedCountries = async (): Promise<?string[]> => {
  await fetchCountries();
  return _blockedCountries;
};

export type MemoedCurrenciesResponse = Array<{ CurrencyISO: string, CurrencySymbol: string }>;
const getCurrencies = async (): Promise<MemoedCurrenciesResponse> => {
  if (_currencies === null) _currencies = await api.CurrencyGetAll();
  return _currencies;
};

module.exports = { getCountries, getBlockedCountries, getCurrencies };
