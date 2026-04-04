/* @flow */
const nock = require('nock'); // eslint-disable-line
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const qs = require('querystring');

const crypt = require('gstech-core/modules/crypt');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();

describe('Skrill Callback API', () => {
  let sessionId;
  let transactionKey;
  let md5result;

  const transactionId = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Skrill_Skrill', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    const secret = crypt.md5(config.providers.skrill.secret).toUpperCase();
    const check = [123123, transactionKey, secret, '20.00', 'EUR', '2'].join('');
    md5result = crypt.md5(check).toUpperCase();
  });

  it('can handle callback', async () =>
    request(app)
      .post('/api/v1/skrill/process/LD')
      .send(qs.stringify({
        mb_transaction_id: transactionId,
        transaction_id: transactionKey,
        merchant_id: 123123,
        status: '2',
        pay_from_email: 'foo@bar.com',
        currency: 'EUR',
        md5sig: md5result,
        amount: '20.00',
        mb_amount: '20.00',
        mb_currency: 'EUR',
        uid: 'LD_Merry.Monster_123123',
      }))
      .expect((res) => {
        expect(res.text).to.equal('ok');
      }));
});

describe('Skrill RapidTransfer Callback API', () => {
  let sessionId;
  let transactionKey;
  let md5result;

  const transactionId = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'RapidTransfer_Skrill', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    const secret = crypt.md5(config.providers.skrill.secret).toUpperCase();
    const check = [123123, transactionKey, secret, '20.00', 'EUR', '2'].join('');
    md5result = crypt.md5(check).toUpperCase();
  });

  it('can handle callback', async () =>
    request(app)
      .post('/api/v1/skrill/process/LD')
      .send(qs.stringify({
        mb_transaction_id: transactionId,
        transaction_id: transactionKey,
        merchant_id: 123123,
        status: '2',
        pay_from_email: 'foo@bar.com',
        currency: 'EUR',
        md5sig: md5result,
        amount: '20.00',
        mb_amount: '20.00',
        mb_currency: 'EUR',
        uid: 'LD_Merry.Monster_123123',
        firstname: 'Merry',
        lastname: 'Monster',
      }))
      .expect((res) => {
        expect(res.text).to.equal('ok');
      }));
});
