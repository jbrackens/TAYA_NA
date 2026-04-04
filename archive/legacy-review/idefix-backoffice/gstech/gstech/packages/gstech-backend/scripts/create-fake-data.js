// @flow
require('flow-remove-types/register');
const promiseLimit = require('promise-limit');
const sample = require('lodash/fp/sample');
const moment = require('moment-timezone');
const { faker } = require('@faker-js/faker');
const logger = require('gstech-core/modules/logger');
const {
  players: { testPlayer },
} = require('./utils/db-data');
const { createPlayer } = require('../server/modules/players');
const { fakeTransactions } = require('./fake-transactions');
const HourlyActivityUpdateJob = require('../server/modules/reports/jobs/HourlyActivityUpdateJob');
const DailyActivityUpdateJob = require('../server/modules/reports/jobs/DailyActivityUpdateJob');

const items = +process.argv[2] || 1000;
const limit = promiseLimit(100);

const fakeData = Array(items)
  .fill()
  .map(() =>
    testPlayer({
      brandId: sample(['LD', 'CJ']),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      address: faker.location.streetAddress(),
      postCode: faker.location.zipCode(),
      city: faker.location.city(),
      countryId: 'DE',
      dateOfBirth: '1989-02-01',
      languageId: sample(['en', 'sv', 'fi', 'de', 'no']),
      currencyId: sample(['EUR', 'NOK', 'SEK', 'USD', 'GBP']),
      ipAddress: faker.internet.ip(),
    }),
  );

Promise.all(
  fakeData.map((job, index) =>
    limit(async () => {
      const player = await createPlayer(job);
      if (index === 0) await fakeTransactions(player);
    }),
  ),
)
  .then(async () => HourlyActivityUpdateJob.update(moment()))
  .then(async () => DailyActivityUpdateJob.update(moment()))
  .then(() => process.exit())
  .catch((err) => logger.error('Error!', err));
