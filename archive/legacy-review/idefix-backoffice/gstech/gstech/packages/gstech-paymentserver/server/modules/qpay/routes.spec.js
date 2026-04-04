/* @flow */
const nock = require('nock'); // eslint-disable-line
const request = require('supertest');  

const app = require('../../index');
const config = require('../../../config');
const { encrypt } = require('./crypto');

// nock.recorder.rec();
describe('QPay Callback API', () => {
  let sessionId;
  let depositTransactionKey;
  let encrypted;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
        currencyId: 'INR',
        countryId: 'IN',
      })
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'QPay_QPay', amount: 500000 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    await request(config.api.backend.url)
      .put(`/api/LD/v1/deposit/${depositTransactionKey}`)
      .send({
        depositParameters: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        message: 'add ok and failure urls',
      })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200);

    const callbackData = {
      transactionKey: depositTransactionKey,
    };

    encrypted = encrypt(callbackData);
  });

  it('can handle success redirect', async () => {
    await request(app)
      .post(`/api/v1/qpay/${encodeURIComponent(encrypted)}`)
      .send()
      .expect(302);
  });
});
