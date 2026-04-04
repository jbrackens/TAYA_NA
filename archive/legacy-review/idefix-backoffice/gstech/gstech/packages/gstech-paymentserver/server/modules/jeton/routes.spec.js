/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-payment-api');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('Jeton Pay Callbacks API', () => {
  let sessionId;
  let transactionKey;

  nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
    .post('/api/v3/integration/merchants/customers', { customer: '12345678' })
    .reply(200, { firstName: 'John', lastName: 'Doe', dateOfBirth: '1985' });

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({})
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'JetonWallet_Jeton', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post('/api/v1/jeton')
      .send({
        paymentId: uuid(),
        orderId: transactionKey,
        type: 'PAY',
        customer: '12345678',
        amount: 500,
        currency: 'EUR',
        status: 'SUCCESS',
        message: 'SUCCESS',
      })
      .expect(200);
    const { balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(50000);
  });

  it('can handle payment cancel', async () => {
    await request(app)
      .post('/api/v1/jeton')
      .send({
        paymentId: uuid(),
        orderId: transactionKey,
        type: 'PAY',
        customer: '12345678',
        amount: 500,
        currency: 'EUR',
        status: 'FAILED',
        message: 'FAILED',
      })
      .expect(200);
    const { balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(0);
  });
});

describe('Jeton Payout Callbacks API', () => {
  let transactionKey;
  let player;

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        initialBalance: 5000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post(`/api/LD/v1/player/${player.id}/accounts`)
      .send({
        method: 'JetonWallet',
        account: player.mobilePhone,
        kycChecked: true,
        parameters: { },
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/test-withdraw')
      .set({ 'X-Authentication': true, Authorization: `Bearer ${player.username}` })
      .send({
        amount: 3000,
        provider: 'Jeton',
      })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post('/api/v1/jeton')
      .send({
        paymentId: uuid(),
        orderId: transactionKey,
        type: 'PAYOUT',
        customer: '12345678',
        amount: 30,
        currency: 'EUR',
        status: 'SUCCESS',
        message: 'SUCCESS',
      })
      .expect(200);
    const { balance } = await api.getWithdrawal(player.username, transactionKey);
    expect(balance.balance).to.equal(5000);
  });

  it('can handle payment cancel', async () => {
    await request(app)
      .post('/api/v1/jeton')
      .send({
        paymentId: uuid(),
        orderId: transactionKey,
        type: 'PAYOUT',
        customer: '12345678',
        amount: 30,
        currency: 'EUR',
        status: 'FAILED',
        message: 'FAILED',
      })
      .expect(200);
    const { balance } = await api.getWithdrawalDetails(transactionKey);
    expect(balance.balance).to.equal(5000);
  });
});
