// @flow
import type { GetCountries } from '../../../types/api';
import type { CountryDraft, Country } from '../../../types/common';

const { upsert2 } = require('gstech-core/modules/knex');

const getCountries = async (knex: Knex, brandId?: BrandId): Promise<GetCountries> =>
  knex('countries')
    .select('brandId', 'code', 'name')
    .where({ blocked: false, registrationAllowed: true })
    .modify(qb => (brandId ? qb.where({ brandId }) : qb));

const getUniqueHstoreKeys = async (
  knex: Knex,
  column: 'segments' | 'tags',
  brandId?: BrandId,
): Promise<string[]> =>
  knex
    .select(knex.raw(`distinct t1.${column}`))
    .from(
      knex('players')
        .select(knex.raw(`skeys(${column}) as ${column}`))
        .modify((qb) => (brandId ? qb.where({ brandId }) : qb))
        .as('t1'),
    )
    .pluck(column);

const upsertCountries = async (knex: Knex, countryDrafts: CountryDraft[]): Promise<Country[]> =>
  knex.transaction(async (tx) => {
    await Promise.all(
      countryDrafts.map(country => upsert2(tx, 'countries', country, ['brandId', 'code'])),
    );
  });

module.exports = {
  getCountries,
  getUniqueHstoreKeys,
  upsertCountries,
};
