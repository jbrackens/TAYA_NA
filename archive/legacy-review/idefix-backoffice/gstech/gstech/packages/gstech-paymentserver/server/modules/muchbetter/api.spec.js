/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('MuchBetter API', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  const withdrawTransactionKey = uuid();
  const depositTransactionId = uuid();
  const withdrawTransactionId = uuid();
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
      .send({ depositMethod: 'MuchBetter_MuchBetter', amount: 100, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    nock('https://w.api.muchbetter.com:443', { encodedQueryParams: true })
      .post('/merchant/pull', {
        amount: '1.00',
        currency: 'EUR',
        idType: 'PHONE',
        idValue: player.mobilePhone,
        merchantAccountId: '540228',
        transactionReference: 'LuckyDino Deposit: 101086349',
        merchantInternalRef: depositTransactionKey,
        optionalParams: {
          merchantCustomerId: player.id,
          brandName: 'LD',
          callbackURL: 'http://localhost:3006/api/v1/muchbetter',
          redirectRequired: true,
          languageISO: 'en',
          dobYYYYMMDD: '19890201',
          countryISO: 'DE',
          lastNameRaw: 'Sparrow',
        },
      })
      .reply(200, {
        idType: 'PHONE',
        idValue: player.mobilePhone,
        amount: '1.00',
        currency: 'EUR',
        transactionReference: 'LuckyDino Deposit: 101086349',
        merchantInternalRef: depositTransactionKey,
        transactionId: depositTransactionId,
        transactionType: 'REQUEST_FUNDS',
        status: 'PENDING_SENDER_APPROVAL',
        customerAccountStatus: 'COMPLETE',
        attempt: 0,
        responseTimestamp: '2020-03-11T12:45:39.890Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
          dobYYYYMMDD: '19890201',
          lastNameRawLevenshteinDistance: '0',
          dobYYYYMMDDMatched: 'true',
          countryISOMatched: 'true',
        },
        redirectURL: 'https://w.api.muchbetter.com/merchant/finish?language=en&logo=/images/logos/merchant/LD.png&trackingCode=THU1NDAyMjg',
      });  

    nock('https://w.api.muchbetter.com:443', { encodedQueryParams: true })
      .post('/merchant/pull', {
        amount: '0.00',
        currency: 'EUR',
        idType: 'PHONE',
        idValue: player.mobilePhone,
        merchantAccountId: '540228',
        transactionReference: 'Please confirm you wish to receive payouts',
        merchantInternalRef: `wd-auth:${withdrawTransactionKey}`,
        optionalParams: {
          merchantCustomerId: player.id,
          brandName: 'LD',
          callbackURL: 'http://localhost:3006/api/v1/muchbetter',
          redirectRequired: true,
          languageISO: 'en',
          dobYYYYMMDD: '19890201',
          countryISO: 'DE',
          lastNameRaw: 'Sparrow',
        },
      })
      .reply(200, {
        idType: 'PHONE',
        idValue: player.mobilePhone,
        amount: '0.00',
        currency: 'EUR',
        transactionReference: 'Please confirm you wish to receive payouts',
        merchantInternalRef: `wd-auth:${withdrawTransactionKey}`,
        transactionId: depositTransactionId,
        transactionType: 'REQUEST_FUNDS',
        status: 'PENDING_SENDER_APPROVAL',
        customerAccountStatus: 'COMPLETE',
        attempt: 0,
        responseTimestamp: '2020-03-11T12:45:39.890Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
          dobYYYYMMDD: '19890201',
          lastNameRawLevenshteinDistance: '0',
          dobYYYYMMDDMatched: 'true',
          countryISOMatched: 'true',
        },
        redirectURL: 'https://w.api.muchbetter.com/merchant/finish?language=en&logo=/images/logos/merchant/LD.png&trackingCode=THU1NDAyMjg',
      });  

    nock('https://w.api.muchbetter.com:443', { encodedQueryParams: true })
      .post('/merchant/push', { amount: '1.00', currency: 'EUR', idType: 'PHONE', idValue: player.mobilePhone, merchantAccountId: '540228', transactionReference: 'LuckyDino Withdrawal: 101086349', merchantInternalRef: withdrawTransactionKey, optionalParams: { merchantCustomerId: player.id, brandName: 'LD', callbackURL: 'http://localhost:3006/api/v1/muchbetter', redirectRequired: false, languageISO: 'en' } })
      .reply(200, { idType: 'PHONE', idValue: player.mobilePhone, amount: '1.00', currency: 'EUR', transactionReference: 'LuckyDino Withdrawal: 101086349', merchantInternalRef: withdrawTransactionKey, transactionId: withdrawTransactionId, transactionType: 'TRANSFER', status: 'PENDING', customerAccountStatus: 'COMPLETE', attempt: 0, responseTimestamp: '2020-03-11T13:58:23.551Z' });
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
          amount: 100,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'MuchBetter',
          paymentProvider: 'MuchBetter',
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
        });
        expect(res.body.html.includes(config.providers.muchbetter.signupLink)).to.equal(true);
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
          amount: 100,
          status: 'accepted',
          account: player.mobilePhone,
          paymentParameters: {},
          accountParameters: {
            id: player.mobilePhone,
          },
          paymentMethodName: 'MuchBetter',
          paymentProvider: 'MuchBetter',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: true,
          id: withdrawTransactionId,
          message: 'PENDING',
          ok: true,
          reject: false,
        });
      }));

  it('can execute withdrawal without prior deposit', async () =>
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
          amount: 100,
          status: 'accepted',
          account: player.mobilePhone,
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'MuchBetter',
          paymentProvider: 'MuchBetter',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          complete: false,
          message: 'Withdrawal is waiting player verification',
          ok: true,
          reject: false,
        });
      }));
});
