/* @flow */
const pg = require('gstech-core/modules/pg');

module.exports = {
  getCountries: (brandId: string): Promise<{ id: string, name: string, minimumAge: Number, blocked: boolean, registrationAllowed: boolean }[]> =>
    pg('countries')
      .select('countries.id', 'base_countries.name', 'countries.minimumAge', 'countries.blocked', 'countries.registrationAllowed')
      .innerJoin('base_countries', 'base_countries.id', 'countries.id')
      .where({ brandId })
      .orderBy('base_countries.name'),
  getBaseCountries: (): Promise<{ id: string, name: string }[]> => pg('base_countries').select('*'),
};
