//@ts-nocheck
import transform from "lodash/transform";

const getCountriesValues = (providerDetails, brand, countriesList) => {
  const countries = providerDetails?.countries
    ?.filter(({ brandId }) => brandId === brand)
    ?.map(({ id }) => {
      return countriesList?.find(country => country.id === id);
    });

  return { selectedCountries: countries };
};

const getCurrenciesValues = (providerDetails, brand) => {
  const currencies = providerDetails?.currencies?.filter(({ brandId }) => brandId === brand);

  return { selectedCurrencies: currencies };
};

export const getInitialValues = (providerDetails = {}, countriesList) => ({
  brands: {
    LD: {
      ...getCountriesValues(providerDetails, "LD", countriesList),
      ...getCurrenciesValues(providerDetails, "LD"),
    },
    CJ: {
      ...getCountriesValues(providerDetails, "CJ", countriesList),
      ...getCurrenciesValues(providerDetails, "CJ"),
    },
    KK: {
      ...getCountriesValues(providerDetails, "KK", countriesList),
      ...getCurrenciesValues(providerDetails, "KK"),
    },
    OS: {
      ...getCountriesValues(providerDetails, "OS", countriesList),
      ...getCurrenciesValues(providerDetails, "OS"),
    },
    FK: {
      ...getCountriesValues(providerDetails, "FK", countriesList),
      ...getCurrenciesValues(providerDetails, "FK"),
    },
    SN: {
      ...getCountriesValues(providerDetails, "SN", countriesList),
      ...getCurrenciesValues(providerDetails, "SN"),
    },
    VB: {
      ...getCountriesValues(providerDetails, "VB", countriesList),
      ...getCurrenciesValues(providerDetails, "VB"),
    },
  },
});

export const getValues = obj => {
  const countries = transform(
    obj,
    (acc, { selectedCountries }, key) => {
      selectedCountries.forEach(country => {
        acc.push({ brandId: key, id: country.id });
      });
    },
    [],
  );

  const currencies = transform(
    obj,
    (acc, { selectedCurrencies }, key) => {
      selectedCurrencies.forEach(currency => {
        if (currency.id !== null) {
          if (currency.maxPendingDeposits === "") {
            acc.push({ ...currency, brandId: key, maxPendingDeposits: null });
          } else {
            acc.push({ ...currency, brandId: key });
          }
        }
      });
    },
    [],
  );

  return { countries, currencies };
};
