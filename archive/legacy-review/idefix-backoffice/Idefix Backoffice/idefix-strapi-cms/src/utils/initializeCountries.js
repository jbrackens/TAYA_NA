const isEqual = require("lodash/isEqual");
const countries = require("../data/countries.json");
const { clearAllData } = require("./clearAllData");

const SERVICE_NAME = "api::country.country";

const createCountries = () => {
  const countriesService = strapi.service(SERVICE_NAME);

  countries.forEach((country) =>{
    if(country.blocked === false){
        countriesService.create({
        data: country,
        })
    }
  }
  );
};

const fetchCurrentCountries = async () => {
  const data = await strapi.entityService.findMany(SERVICE_NAME, {
    /* from name, code, minAge, regAllowed, blocked, loginsAllowed */
    fields: ["name", "code"],
  });

  const filteredData = data.map(({ name, code }) => ({ name, code }));
  return filteredData;
};

const initializeCountries = async () => {
    console.log('initilizing countries')
  try {
    const currentCountries = await fetchCurrentCountries();
    const isSameCountries = isEqual(currentCountries.sort(), countries.sort());

    if (!isSameCountries) {
      await clearAllData(SERVICE_NAME);
      createCountries();
      console.log("InitializeCountries successed!");
    }
  } catch (err) {
    console.log(err, "InitializeCountries failed!");
  }
};

module.exports = {
  initializeCountries,
};