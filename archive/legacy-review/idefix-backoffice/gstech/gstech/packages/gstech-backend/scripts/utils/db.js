// @flow
import type { Player } from 'gstech-core/modules/types/player';

const request = require('supertest');
const pg = require('gstech-core/modules/pg');
const app = require('../../server');
const { players } = require('./db-data');

const post = async (path: string, body: any, status: number = 201) =>
  await request(app)
    .post(path)
    .send(body)
    .expect(status);

const cleanUpPhotos = async () => {
  await pg('kyc_documents').delete();
  await pg('photos').delete();
};
const cleanUpLocks = (): Promise<void> => pg('locks').delete();
const cleanUpPlayers = async (): Promise<void> => {
  await cleanUpLocks();
  return await pg('players').delete();
};

// TODO consider adding option to have overrides for jack and john separately to enable different player attrs in tests
const setupPlayers = async (override: {} = {}): Promise<{ john: Player, jack: Player }> => {
  await cleanUpPlayers();
  const { body: john } = await post(
    '/api/LD/v1/players',
    { ...players.john, ...override },
  );

  const { body: jack } = await post(
    '/api/LD/v1/players',
    { ...players.jack, ...override },
  );

  return { john: john.player, jack: jack.player };
};

const setFixedConversionRates = async () => {
  await pg('conversion_rate_histories').insert([
    { currencyId: 'USD', conversionRate: 1 },
    { currencyId: 'GBP', conversionRate: 1 },
    { currencyId: 'SEK', conversionRate: 10 },
    { currencyId: 'NOK', conversionRate: 10 },
  ]);
  await pg.raw('refresh materialized view conversion_rates');
  await pg.raw('refresh materialized view monthly_conversion_rates');
};

module.exports = {
  cleanUpPhotos,
  cleanUpPlayers,
  setupPlayers,
  setFixedConversionRates,
};
