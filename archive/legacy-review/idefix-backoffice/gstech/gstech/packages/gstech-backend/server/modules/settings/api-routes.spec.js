/* @flow */
const request = require('supertest');
const app = require('../../index');

describe('Countries', () => {
  describe('GET /countries', () => {
    it('returns available countries for brand', async () =>
      request(app)
        .get('/api/KK/v1/countries')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset([
            {
              id: 'FI',
              minimumAge: 18,
              name: 'Finland',
              blocked: false,
              registrationAllowed: true,
            },
            {
              id: 'IL',
              minimumAge: 18,
              name: 'Israel',
              blocked: true,
              registrationAllowed: false,
            },
            { id: 'MT', minimumAge: 18, name: 'Malta', blocked: false, registrationAllowed: true },
            {
              id: 'US',
              minimumAge: 18,
              name: 'United States',
              blocked: true,
              registrationAllowed: false,
            },
            {
              id: 'XX',
              minimumAge: 18,
              name: 'Unknown',
              blocked: false,
              registrationAllowed: false,
            },
          ]);
        }));
  });
});

describe('Currencies', () => {
  describe('GET /currencies', () => {
    it('returns available currencies for brand', async () =>
      request(app)
        .get('/api/KK/v1/currencies')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal([
            { id: 'EUR', symbol: '€', defaultConversion: 1 },
            { id: 'NOK', symbol: 'kr.', defaultConversion: 10 },
            { id: 'CAD', symbol: '$', defaultConversion: 1 },
          ]);
        }));
  });
});

describe('Languages', () => {
  describe('GET /languages', () => {
    it('returns available languages for brand', async () =>
      request(app)
        .get('/api/KK/v1/languages')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal([
            { id: 'fi', name: 'Finnish' },
            { id: 'no', name: 'Norwegian' },
          ]);
        }));
  });
});
