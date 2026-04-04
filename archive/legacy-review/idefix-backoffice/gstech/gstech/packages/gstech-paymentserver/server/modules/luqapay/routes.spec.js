/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-payment-api');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('Luqapay Callbacks API', () => {
  let sessionId;
  let transactionKey;
  let player;

  nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
    .post('/api/v3/integration/merchants/customers', { customer: '12345678' })
    .reply(200, { firstName: 'John', lastName: 'Doe', dateOfBirth: '1985' });

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        countryId: 'NO',
      })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'COMMUNITYBANK_Luqapay', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

      nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
        .post('/v2/checkout/initialize', {
          apiKey: '087b151fb5bd44fdade70a393cd96d63',
          amount: '50',
          country: 'NO',
          currency: 'EUR',
          city: 'Dessau',
          dateOfBirth: '1989-02-01',
          defaultPaymentMethod: 'COMMUNITY_BANK',
          email:  player.email,
          failRedirectUrl: 'https://beta.luckydino.com/api/deposit/fail',
          firstName: 'Jack',
          lastName: 'Sparrow',
          language: 'EN',
          referenceNo: transactionKey,
          successRedirectUrl: `https://beta.luckydino.com/api/deposit/pending/${transactionKey}`,
        })
        .reply(200, {
          token:
            'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNDZiZTUyOTQ5MzM0MWI5YTI1NzcxNWI3NTIyOTM0MiIsImF1ZCI6IndhbGxldCIsIm5iZiI6MTYyMzA2NzgyMiwicmVzb3VyY2UiOiJBUFAiLCJyb2xlcyI6WyJBUFBfQUNDRVNTIl0sImd1aWQiOiIxOGE1MDVmMmZlNDY0ZmViOWY1YzVmYzQwYjJhYjA1NiIsImV4cCI6MTYyMzA2OTYyMn0.ApPI8wSdWdzm6673BYiV8Q2SanfM3uxYI7jJAo2juQK8SF9d_MOF4EfQSGW8WtRlMGvnxkVQu2DilzX-JvRmRA',
          redirectUrl:
            'https://sandbox-checkout.luqapay.com/init-payment?token=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNDZiZTUyOTQ5MzM0MWI5YTI1NzcxNWI3NTIyOTM0MiIsImF1ZCI6IndhbGxldCIsIm5iZiI6MTYyMzA2NzgyMiwicmVzb3VyY2UiOiJBUFAiLCJyb2xlcyI6WyJBUFBfQUNDRVNTIl0sImd1aWQiOiIxOGE1MDVmMmZlNDY0ZmViOWY1YzVmYzQwYjJhYjA1NiIsImV4cCI6MTYyMzA2OTYyMn0.ApPI8wSdWdzm6673BYiV8Q2SanfM3uxYI7jJAo2juQK8SF9d_MOF4EfQSGW8WtRlMGvnxkVQu2DilzX-JvRmRA&successRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Fpending%2F54e8ec10-c789-11eb-ba71-3d1b74585050&failRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Ffail',
          transactionId: '18a505f2fe464feb9f5c5fc40b2ab056',
          code: '00000',
          message: 'APPROVED',
          status: 'APPROVED',
        });

      nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
        .post('/v2/checkout/pay', {
          account: { bankCode: 'DNBANOKKXXX' },
          customerInfo: { ip: '127.0.0.1', agent: 'No user agent' },
          paymentMethod: 'COMMUNITY_BANK',
          activeAmountId: '5175809',
        })
        .reply(200, {
          redirectUrl:
            'https://sandbox-checkout.luqapay.com/init-payment?token=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNDZiZTUyOTQ5MzM0MWI5YTI1NzcxNWI3NTIyOTM0MiIsImF1ZCI6IndhbGxldCIsIm5iZiI6MTYyMzA2NzgyMiwicmVzb3VyY2UiOiJBUFAiLCJyb2xlcyI6WyJBUFBfQUNDRVNTIl0sImd1aWQiOiIxOGE1MDVmMmZlNDY0ZmViOWY1YzVmYzQwYjJhYjA1NiIsImV4cCI6MTYyMzA2OTYyMn0.ApPI8wSdWdzm6673BYiV8Q2SanfM3uxYI7jJAo2juQK8SF9d_MOF4EfQSGW8WtRlMGvnxkVQu2DilzX-JvRmRA&successRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Fpending%2F54e8ec10-c789-11eb-ba71-3d1b74585050&failRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Ffail',
          transactionId: '18a505f2fe464feb9f5c5fc40b2ab056',
          code: '00000',
          message: 'APPROVED',
          status: 'APPROVED',
        });
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post(`/api/v1/luqapay/process?transactionKey=${transactionKey}`)
      .send({
        swiftCode: 'DNBANOKKXXX',
        amount: '5175809_50',
        ok: `https://beta.luckydino.com/api/deposit/pending/${transactionKey}`,
        failure: 'https://beta.luckydino.com/api/deposit/fail',
        currency: 'NOK',
      })
      .expect(302)
      .expect((res) => {
        expect(res.headers.location).to.equal('https://sandbox-checkout.luqapay.com/init-payment?token=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNDZiZTUyOTQ5MzM0MWI5YTI1NzcxNWI3NTIyOTM0MiIsImF1ZCI6IndhbGxldCIsIm5iZiI6MTYyMzA2NzgyMiwicmVzb3VyY2UiOiJBUFAiLCJyb2xlcyI6WyJBUFBfQUNDRVNTIl0sImd1aWQiOiIxOGE1MDVmMmZlNDY0ZmViOWY1YzVmYzQwYjJhYjA1NiIsImV4cCI6MTYyMzA2OTYyMn0.ApPI8wSdWdzm6673BYiV8Q2SanfM3uxYI7jJAo2juQK8SF9d_MOF4EfQSGW8WtRlMGvnxkVQu2DilzX-JvRmRA&successRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Fpending%2F54e8ec10-c789-11eb-ba71-3d1b74585050&failRedirectUrl=https%3A%2F%2Fbeta.luckydino.com%2Fapi%2Fdeposit%2Ffail');
      });
  });

  it('can handle payment success complete', async () => {
    await request(app)
      .post(`/api/v1/luqapay`)
      .send({
        code: '00000',
        status: 'APPROVED',
        message: 'APPROVED',
        transactionId: uuid(),
        referenceNo: transactionKey,
        paymentMethod: 'COMMUNITY_BANK',
        timestamp: '1623059581',
        amount: '100.20',
        currency: 'NOK',
        email: 'vladimir@luckydino.com',
        token: '161941881e8d382309bea783a0b3ca30',
        tokenExtended: '1e5ef1d45510de497cdf210c0a4a2290',
        apiKey: null,
        secretKey: null,
        creditCardPreAuth: null,
        refundUrl: null,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
        });
      });

    const { balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(10020);
  });
});
