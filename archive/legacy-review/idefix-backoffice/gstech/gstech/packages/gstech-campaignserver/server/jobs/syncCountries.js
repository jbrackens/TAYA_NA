/* @flow */
import type {
  GetCountriesResponse,
} from 'gstech-core/modules/clients/backend-api-types';

const pg = require('gstech-core/modules/pg');
const client = require('gstech-core/modules/clients/backend-auth-api');
const logger = require('gstech-core/modules/logger');
const { brands } = require('gstech-core/modules/constants');

const { upsertCountries } = require('../modules/Config/repository');

module.exports = async () => {
  logger.info('syncCountries: starting...');
  try {
    await Promise.all(
      brands.map(async ({ id: brandId }) => {
        const countries: GetCountriesResponse = await client.getCountries(brandId);
        await upsertCountries(
          pg,
          countries.map(({ id, ...country }) => ({ brandId, code: id, ...country })),
        );
      }),
    );
  } catch (e) {
    logger.error('syncCountries', e);
  }

  logger.info('syncCountries: finished.');
};
