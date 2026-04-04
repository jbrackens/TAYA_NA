/* @flow */
const pg = require('gstech-core/modules/pg');
const { brands } = require('gstech-core/modules/constants');

export type CountryFields = {
  minimumAge: number,
  registrationAllowed: boolean,
  loginAllowed: boolean,
  blocked: boolean,
  riskProfile: 'low' | 'medium' | 'high',
  monthlyIncomeThreshold: ?number,
};

export type Country = {
  id: string,
  name: string,
} & CountryFields;

const mostCommonInColumn = (column: string): Knex$Raw<any> =>
  pg.raw(`pg_catalog.mode() within group (order by "${column}")`);

const get = (brandId: string): Knex$QueryBuilder<Country[]> =>
  pg('base_countries')
    .select({
      brandId: pg.raw(`'${brandId}'`),
      id: 'base_countries.id',
      name: 'base_countries.name',
      ...(brandId === 'all'
        ? {
            minimumAge: mostCommonInColumn('minimumAge'),
            registrationAllowed: mostCommonInColumn('registrationAllowed'),
            loginAllowed: mostCommonInColumn('loginAllowed'),
            blocked: mostCommonInColumn('blocked'),
            riskProfile: mostCommonInColumn('riskProfile'),
            monthlyIncomeThreshold: mostCommonInColumn('monthlyIncomeThreshold'),
          }
        : {
            minimumAge: pg.raw('coalesce("minimumAge", 18)'),
            registrationAllowed: pg.raw('coalesce("registrationAllowed", false)'),
            loginAllowed: pg.raw('coalesce("loginAllowed", false)'),
            blocked: pg.raw('coalesce("blocked", true)'),
            riskProfile: pg.raw(`coalesce("riskProfile", 'low')`),
            monthlyIncomeThreshold: pg.raw('coalesce("monthlyIncomeThreshold", null)'),
          }),
    })
    .leftOuterJoin('countries', (qb) => {
      qb.on('countries.id', 'base_countries.id');
      if (brandId === 'all') return qb;
      return qb.on('countries.brandId', pg.raw(`'${brandId}'`));
    })
    .modify((qb) =>
      brandId === 'all'
        ? qb.groupBy('countries.id', 'base_countries.name', 'base_countries.id')
        : qb,
    )
    .orderBy([
      { column: 'registrationAllowed', order: 'desc' },
      'base_countries.name',
      'countries.id',
    ]);

const find = (brandId: string, id: string): Knex$QueryBuilder<Country> =>
  pg('countries').first('*').where({ brandId, id });

const update = async (
  brandId: string,
  countryId: string,
  { riskProfile, ...countryUpdate }: CountryFields,
): Promise<any> =>
  pg.transaction(async (tx) => {
    await tx('countries').update({ riskProfile }).where({ id: countryId });
    return await tx('countries')
      .insert(
        brandId === 'all'
          ? brands.map(({ id: brndId }) => ({
              brandId: brndId,
              id: countryId,
              ...countryUpdate,
            }))
          : {
              brandId,
              id: countryId,
              ...countryUpdate,
            },
      )
      .onConflict(['brandId', 'id'])
      .merge([
        'minimumAge',
        'loginAllowed',
        'registrationAllowed',
        'blocked',
        'monthlyIncomeThreshold',
      ])
      .returning(['*'])
      .then(([result]) => result);
  });

module.exports = { get, find, update };
