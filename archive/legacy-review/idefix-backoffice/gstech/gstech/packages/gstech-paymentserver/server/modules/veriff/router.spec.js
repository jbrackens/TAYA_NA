/* @flow */
const request = require('supertest');  

const app = require('../../index');
const config = require('../../../config');
const { sessionSignature } = require('./signature');

describe('Veriff Callback API', () => {
  let username;
  let signature;
  let body;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        username = res.body.player.username;
      })
      .expect(200);

    body = {
      status: 'success',
      verification: {
        vendorData: username,
        acceptanceTime: '2020-11-24T10:57:35.000Z',
        decisionTime: '2020-11-24T11:01:21.527Z',
        code: 9001,
        id: '5bc577bf-f746-45aa-a9e1-54eeaeb861db',
        status: 'approved',
        reason: null,
        reasonCode: null,
        person: {
          firstName: 'Jack',
          lastName: 'Sparrow',
          citizenship: null,
          idNumber: null,
          gender: null,
          dateOfBirth: null,
          yearOfBirth: null,
          placeOfBirth: null,
          nationality: null,
          pepSanctionMatch: null,
        },
        document: {
          number: null,
          type: 'ID_CARD',
          country: 'EE',
          validFrom: null,
          validUntil: null,
        },
        comments: [],
        additionalVerifiedData: {},
      },
      technicalData: {
        ip: null,
      },
    };
    signature = sessionSignature(body, false);
  });

  it('check for valid public api key', async () =>
    request(app)
      .post('/api/v1/veriff/identify')
      .set({
        'x-signature': '123123',
        'x-auth-client': '123123',
      })
      .send(body)
      .expect(500)
      .expect((res) => {
        expect(res.body).to.deep.equal({ status: 'FAIL' });
      }));

  it('check for valid signature', async () =>
    request(app)
      .post('/api/v1/veriff/identify')
      .set({
        'x-signature': '123123',
        'x-auth-client': '07d4478d-03d4-4fa9-844a-aa381d5395e5',
      })
      .send(body)
      .expect(500)
      .expect((res) => {
        expect(res.body).to.deep.equal({ status: 'FAIL' });
      }));

  it('can handle identify callback', async () =>
    request(app)
      .post('/api/v1/veriff/identify')
      .set({
        'x-signature': signature,
        'x-auth-client': '07d4478d-03d4-4fa9-844a-aa381d5395e5',
      })
      .send(body)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({ status: 'OK' });
      }));
});
