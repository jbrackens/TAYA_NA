/* @flow */
const pg = require('gstech-core/modules/pg');

module.exports = {
  getLanguages: (brandId: string): Promise<{ id: String, name: string }[]> =>
    pg('languages')
      .select('languages.id', 'base_languages.name')
      .innerJoin('base_languages', 'base_languages.id', 'languages.id')
      .where({ brandId }),
};
