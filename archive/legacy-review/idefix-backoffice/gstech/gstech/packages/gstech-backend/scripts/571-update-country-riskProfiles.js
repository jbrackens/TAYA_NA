// @flow
const _ = require('lodash');
const promiseLimit = require('promise-limit');
const logger = require('gstech-core/modules/logger');

const pg = require('gstech-core/modules/pg');

const countryRiskProfiles = require('./assets/571-country-code-list-mga.json');

type countryRiskProfile = {
  id: string,
  name: string,
  riskProfile: 'low' | 'medium' | 'high',
}

(async (startOffset: ?string, numRec: ?string) => {
  const limit = promiseLimit(10);
  const groupOperationResults = (opR: Array<<T = string>(p: Promise<T> | T) => T>) =>
    _.chain(opR)
      .map((s) => s.split(':'))
      .groupBy((a) => a[0])
      .mapValues((a) => _.map(a, (b) => _.slice(b, 1).join(':')))
      .value();
  const start = +startOffset || 0;
  const end = start + (+numRec || countryRiskProfiles .length - start);
  const targets: countryRiskProfile[] = _.slice(countryRiskProfiles , start, end);
  logger.info(`Processing ${targets.length}/${countryRiskProfiles .length} records from pos ${start}`);
  const operations = targets.map(
    (r) =>
      async (record: countryRiskProfile = r): Promise<string> =>
        pg.transaction(async (tx): Promise<string> => {
          const { id, name, riskProfile } = record;
          try {
            const countries = await tx('countries').select(['id', 'brandId', 'riskProfile']).where({ id });
            if (!countries) {
              logger.warn(`!!! 571 ${name}(${id}) not found`);
              return `NF:${name}(${id})`;
            }
            for (const country of countries) {
              if (country.riskProfile === riskProfile) {
                logger.info(`+++ 571 ${country.id}-${country.brandId} already has correct riskProfile`);
              } else {
                await tx('countries')
                  .update({ riskProfile })
                  .where({ id: country.id, brandId: country.brandId });
                logger.info(`+++ 571 ${country.id}-${country.brandId}`, {
                  prevRisk: country.riskProfile,
                  newRisk: riskProfile,
                });
              }
            }
            return `OK:${id}`;
          } catch (error) {
            logger.error(`XXX 571 ${id}`, { error });
            return `ERR:${id}`;
          }
        }),
  );
  const results = groupOperationResults(
    await Promise.all(operations.map((operation) => limit(() => operation()))),
  );
  const summary = { ok: results.OK?.length, err: results.ERR, nf: results.NF };
  logger.info('Done', { summary });
  process.exit(0);
})(..._.slice(process.argv, _.findIndex(process.argv, (a) => a === '--') + 2));
