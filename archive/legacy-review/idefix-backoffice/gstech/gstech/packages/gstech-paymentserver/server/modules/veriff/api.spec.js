/* @flow */
const request = require('supertest');
const nock = require('nock');

const api = require('../../api-server');

nock('https://stationapi.veriff.com:443', { encodedQueryParams: true })
  .post('/v1/sessions', (r) => r.verification.vendorData === 'LD_Test.User_123')
  .reply(
    201,
    {
      status: 'success',
      verification: {
        id: '413b88d1-f6d7-4d8d-bb9d-7232ef8193a3',
        url:
          'https://alchemy.veriff.com/v/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiNDEzYjg4ZDEtZjZkNy00ZDhkLWJiOWQtNzIzMmVmODE5M2EzIiwiaWF0IjoxNjA3NDMzNDQ5fQ.qqAoEY1KX16xnmx_9L3Miq3ZJxTnzUwawDfxZhEl-UI',
        vendorData: 'LD_Test.User_123',
        host: 'https://alchemy.veriff.com',
        status: 'created',
        sessionToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiNDEzYjg4ZDEtZjZkNy00ZDhkLWJiOWQtNzIzMmVmODE5M2EzIiwiaWF0IjoxNjA3NDMzNDQ5fQ.qqAoEY1KX16xnmx_9L3Miq3ZJxTnzUwawDfxZhEl-UI',
      },
    },
    [
      'X-AUTH-CLIENT',
      '07d4478d-03d4-4fa9-844a-aa381d5395e5',
      'X-SIGNATURE',
      '040408305de714507c6801eb8007e2bc370e81104c7a8041d7d138a8a097a2f0',
    ],
  );

describe('Veriff API', () => {
  it('can execute identify', async () =>
    request(api)
      .post('/api/v1/identify')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          firstName: 'Test',
          lastName: 'User',
          currencyId: 'EUR',
          countryId: 'FI',
          languageId: 'en',
          address: '123 sesame street',
          postCode: '123456',
          city: 'Sudden Valley',
          address_country: 'FI',
          dateOfBirth: '1995-01-01',
          verified: false,
          mobilePhone: '3586666666666',
          brandId: 'LD',
        },
        identify: {
          paymentProvider: 'Veriff',
        },
        urls: {
          ok: 'https://127.0.0.1:3003/ok',
          failure: 'https://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).to.deep.equal({
          requiresFullscreen: true,
          url:
            'https://alchemy.veriff.com/v/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiNDEzYjg4ZDEtZjZkNy00ZDhkLWJiOWQtNzIzMmVmODE5M2EzIiwiaWF0IjoxNjA3NDMzNDQ5fQ.qqAoEY1KX16xnmx_9L3Miq3ZJxTnzUwawDfxZhEl-UI',
        });
      }));
});
