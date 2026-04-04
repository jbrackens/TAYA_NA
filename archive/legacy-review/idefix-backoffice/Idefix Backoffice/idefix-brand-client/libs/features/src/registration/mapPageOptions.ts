import { CmsPageOptions } from "@brandserver-client/types";

export function mapPageOptions(pageOptions: CmsPageOptions) {
  const currentCountry =
    pageOptions.formData &&
    (pageOptions.formData.country || pageOptions.formData.countries[0]);

  let currencyISO = "";
  let defaultCountryISO = "";

  if (currentCountry) {
    currencyISO = currentCountry.CurrencyISO;
    defaultCountryISO = currentCountry.CountryISO;
  }

  const phoneCodes = pageOptions?.formData?.phoneRegions.map(
    region => region.code
  );

  const countries = pageOptions.formData?.countries.map(country => ({
    CountryName: country.CountryName,
    CountryISO: country.CountryISO
  }));

  const countryISO = countries?.find(
    country => country.CountryISO === defaultCountryISO
  )
    ? defaultCountryISO
    : countries && countries[0].CountryISO;

  const countryPhoneCode = pageOptions?.formData?.phoneCountry?.code;

  const lander = pageOptions?.options?.id;

  const handleRegister = (nextUrl: string) => {
    const lander = pageOptions && pageOptions.options && pageOptions.options.id;
    const location =
      pageOptions && pageOptions.options && pageOptions.options.location;

    if (lander && location) {
      return (window.top!.location.href = location);
    }

    if (nextUrl) {
      return (window.top!.location.href = nextUrl);
    }

    window.top!.location.href = "/loggedin/";
  };

  return {
    currencyISO,
    phoneCodes,
    countryISO,
    countryPhoneCode,
    lander,
    countries,
    handleRegister
  };
}
