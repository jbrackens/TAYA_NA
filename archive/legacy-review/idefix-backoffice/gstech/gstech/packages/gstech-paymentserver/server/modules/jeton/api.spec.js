/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('Jeton Checkout/Wallet Payout', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  const withdrawTransactionKey = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send()
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'JetonWallet_Jeton', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

      nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
        .post('/api/v3/integration/merchants/payments/pay', {
          orderId: depositTransactionKey,
          currency: 'EUR',
          amount: 50,
          returnUrl: 'http://127.0.0.1:3003/ok',
          method: 'CHECKOUT',
          customer: null,
          language: 'en',
        })
        .reply(200, {
          paymentId: 111328,
          orderId: depositTransactionKey,
          checkout:
            'https://sandbox.jetoncheckout.com/pay?token=eyJhbGciOiJIUzUxMiJ9.eyJjcmVhdGVkQXQiOiIxNjAzMTgxMjQyNDEzIiwiYXVkIjoic2FuZGJveC5qZXRvbi5jb20iLCJzdWIiOiI3NjQwIiwibmJmIjoxNjAzMTgxMjQyLCJtZXJjaGFudElkIjoiNzY0MCIsInBheW1lbnRJZCI6IjExMTMyOCIsInJvbGVzIjpbIk1FUkNIQU5UIl0sImV4cCI6MTYwMzE4NDg0MiwiaWF0IjoxNjAzMTgxMjQyLCJleHBpcmVzQXQiOiIxNjAzMTg0ODQyNDEzIiwicGFydHkiOiI3NjQwIn0.R5F0hNgP1E8yKB0Iwk4Wt9Q90-sktGvAQ3lYABsSJNPxH9kQ8bFI0-VaFaK3Z1gMRKMwOhDdkLKA-eHxYVbbgw&utm_source=83ad47179a7346e398c6d719f9ec1870&utm_medium=02851475',
          method: 'CHECKOUT',
          qr: null,
        });

      nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
        .post('/api/v3/integration/merchants/payments/payout', {
          orderId: withdrawTransactionKey,
          currency: 'EUR',
          amount: 10,
          customer: '12345678',
        })
        .reply(200, {
          paymentId: 111328,
          orderId: depositTransactionKey,
        });
  });

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player,
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        deposit: {
          paymentId: 101086349,
          transactionKey: depositTransactionKey,
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 5000,
          status: 'accepted',
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'JetonWallet',
          paymentProvider: 'Jeton',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
          url: 'https://sandbox.jetoncheckout.com/pay?token=eyJhbGciOiJIUzUxMiJ9.eyJjcmVhdGVkQXQiOiIxNjAzMTgxMjQyNDEzIiwiYXVkIjoic2FuZGJveC5qZXRvbi5jb20iLCJzdWIiOiI3NjQwIiwibmJmIjoxNjAzMTgxMjQyLCJtZXJjaGFudElkIjoiNzY0MCIsInBheW1lbnRJZCI6IjExMTMyOCIsInJvbGVzIjpbIk1FUkNIQU5UIl0sImV4cCI6MTYwMzE4NDg0MiwiaWF0IjoxNjAzMTgxMjQyLCJleHBpcmVzQXQiOiIxNjAzMTg0ODQyNDEzIiwicGFydHkiOiI3NjQwIn0.R5F0hNgP1E8yKB0Iwk4Wt9Q90-sktGvAQ3lYABsSJNPxH9kQ8bFI0-VaFaK3Z1gMRKMwOhDdkLKA-eHxYVbbgw&utm_source=83ad47179a7346e398c6d719f9ec1870&utm_medium=02851475',
        });
      }));

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player,
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: withdrawTransactionKey,
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 1000,
          status: 'accepted',
          account: '12345678',
          paymentParameters: {},
          accountParameters: {
            id: player.mobilePhone,
          },
          paymentMethodName: 'JetonWallet',
          paymentProvider: 'Jeton',
        },
        user: { handle: 'Test', name: 'Test User' },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
          message: 'Jeton withdrawal initiated',
          reject: false,
          complete: false,
          id: '111328',
        });
      }));
});


describe('Jeton Go', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  const withdrawTransactionKey = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send()
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'JetonGO_Jeton', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

      nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
        .post('/api/v3/integration/merchants/payments/pay', {
          orderId: depositTransactionKey,
          currency: 'EUR',
          amount: 50,
          returnUrl: 'http://127.0.0.1:3003/ok',
          method: 'JETGO',
          customer: '12345678',
          language: 'en',
        })
        .reply(200, {
          paymentId: 111328,
          orderId: depositTransactionKey,
          checkout: null,
          qr: 'aHR0cHM6Ly9qZXRvbi5jb20=',
          method: 'JETGO',
          appPaymentLink: 'jetgo://pay?reference=1234'
        });

      nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
        .post('/api/v3/integration/merchants/payments/payout', {
          orderId: withdrawTransactionKey,
          currency: 'EUR',
          amount: 10,
          customer: '12345678',
          type: 'JETGO',
          note: '',
        })
        .reply(200, {
          paymentId: 111328,
          orderId: depositTransactionKey,
        });
  });

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player,
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        deposit: {
          paymentId: 101086349,
          transactionKey: depositTransactionKey,
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 5000,
          status: 'accepted',
          account: '12345678',
          paymentParameters: {},
          accountParameters: {},
          paymentMethod: 'JetonGO',
          paymentProvider: 'Jeton',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        });

        expect(res.body.html).to.include.all.string(
          'aHR0cHM6Ly9qZXRvbi5jb20=',
          'jetgo://pay?reference=1234',
        );
      }));

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player,
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086349,
          transactionKey: withdrawTransactionKey,
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 1000,
          status: 'accepted',
          account: '12345678',
          paymentParameters: {},
          accountParameters: {
            id: player.mobilePhone,
          },
          paymentMethodName: 'JetonGO',
          paymentProvider: 'Jeton',
        },
        user: { handle: 'Test', name: 'Test User' },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          ok: true,
          message: 'Jeton withdrawal initiated',
          reject: false,
          complete: false,
          id: '111328',
        });
      }));
});

