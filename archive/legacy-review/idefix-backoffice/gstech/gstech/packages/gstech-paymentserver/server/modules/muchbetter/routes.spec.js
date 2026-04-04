/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-payment-api');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('MuchBetter Callback API', () => {
  let sessionId;
  let transactionKey;
  let player;

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({})
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'MuchBetter_MuchBetter', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    await api.updateDeposit(player.username, transactionKey, {
      account: player.mobilePhone,
      message: 'OK',
    });
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post('/api/v1/muchbetter')
      .send({
        amount: '1.00',
        currency: 'EUR',
        transactionReference: 'LuckyDino Deposit: 101086349',
        merchantInternalRef: transactionKey,
        transactionId: uuid(),
        transactionType: 'REQUEST_FUNDS',
        status: 'COMPLETED',
        customerAccountStatus: 'COMPLETE',
        attempt: 3,
        responseTimestamp: '2020-03-11T12:47:02.889Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
          lastNameRawLevenshteinDistance: '0',
          dobYYYYMMDDMatched: 'true',
          countryISOMatched: 'true',
        },
      })
      .expect(200);
    const { deposit, balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(100);

    const account = await api.getAccount(deposit.username, deposit.accountId);
    expect(account).to.containSubset({
      account: player.mobilePhone,
      kycChecked: true,
    });
  });

  it('does not verify account when name does not match', async () => {
    await request(app)
      .post('/api/v1/muchbetter')
      .send({
        amount: '1.00',
        currency: 'EUR',
        transactionReference: 'LuckyDino Deposit: 101086349',
        merchantInternalRef: transactionKey,
        transactionId: uuid(),
        transactionType: 'REQUEST_FUNDS',
        status: 'COMPLETED',
        customerAccountStatus: 'COMPLETE',
        attempt: 3,
        responseTimestamp: '2020-03-11T12:47:02.889Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
          lastNameRawLevenshteinDistance: '4',
          dobYYYYMMDDMatched: 'true',
          countryISOMatched: 'true',
        },
      })
      .expect(200);
    const { deposit, balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(100);

    const account = await api.getAccount(deposit.username, deposit.accountId);
    expect(account).to.containSubset({
      account: player.mobilePhone,
      kycChecked: false,
    });
  });

  it('can handle payment reject', async () => {
    await request(app)
      .post('/api/v1/muchbetter')
      .send({
        amount: '1.00',
        currency: 'EUR',
        transactionReference: 'LuckyDino Deposit: 101086349',
        merchantInternalRef: transactionKey,
        transactionId: 17926554,
        transactionType: 'REQUEST_FUNDS',
        status: 'REJECTED',
        customerAccountStatus: 'COMPLETE',
        attempt: 3,
        responseTimestamp: '2020-03-11T13:13:33.639Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true });
      });
  });
});

describe('MuchBetter Callback API (0 auth)', () => {
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
        method: 'MuchBetter',
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
        provider: 'MuchBetter',
      })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
    const { body: { withdrawal } } = await request(config.api.backend.url).get(`/api/LD/v1/withdrawal/${transactionKey}/details`);
    nock('https://w.api.muchbetter.com:443', { encodedQueryParams: true })
      .post('/merchant/push', { amount: '30.00', currency: 'EUR', idType: 'PHONE', idValue: player.mobilePhone, merchantAccountId: '540228', transactionReference: `LuckyDino Withdrawal: ${withdrawal.paymentId}`, merchantInternalRef: transactionKey, optionalParams: { merchantCustomerId: player.id, brandName: 'LD', callbackURL: 'http://localhost:3006/api/v1/muchbetter', redirectRequired: false, languageISO: 'en' } })
      .reply(200, { idType: 'PHONE', idValue: player.mobilePhone, amount: '30.00', currency: 'EUR', transactionReference: 'LuckyDino Withdrawal: 101086349', merchantInternalRef: transactionKey, transactionId: uuid(), transactionType: 'TRANSFER', status: 'PENDING', customerAccountStatus: 'COMPLETE', attempt: 0, responseTimestamp: '2020-03-11T13:58:23.551Z' });
  });

  it('can handle payment complete', async () => {
    await request(app)
      .post('/api/v1/muchbetter')
      .send({
        amount: '0.00',
        currency: 'EUR',
        transactionReference: 'Please confirm you with to receive payouts',
        merchantInternalRef: `wd-auth:${transactionKey}`,
        transactionId: uuid(),
        transactionType: 'REQUEST_FUNDS',
        status: 'COMPLETED',
        customerAccountStatus: 'COMPLETE',
        attempt: 3,
        responseTimestamp: '2020-03-11T12:47:02.889Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
          lastNameRawLevenshteinDistance: '0',
          dobYYYYMMDDMatched: 'true',
          countryISOMatched: 'true',
        },
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true });
      })
      .expect(200);

    const { withdrawal, balance } = await api.getWithdrawal(player.username, transactionKey);
    expect(balance.balance).to.equal(5000);

    const account = await api.getAccount(player.username, withdrawal.accountId);
    expect(account).to.containSubset({
      account: player.mobilePhone,
      kycChecked: true,
    });
  });

  it('can handle payment reject', async () => {
    await request(app)
      .post('/api/v1/muchbetter')
      .send({
        amount: '0.00',
        currency: 'EUR',
        transactionReference: 'Please confirm you with to receive payouts',
        merchantInternalRef: `wd-auth:${transactionKey}`,
        transactionId: 17926554,
        transactionType: 'REQUEST_FUNDS',
        status: 'REJECTED',
        customerAccountStatus: 'COMPLETE',
        attempt: 3,
        responseTimestamp: '2020-03-11T13:13:33.639Z',
        optionalParams: {
          brandName: 'LD',
          callbackURL: 'https://ba38ecca.eu.ngrok.io/api/v1/muchbetter',
          redirectRequired: 'true',
          languageISO: 'en',
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({ ok: true });
      });
  });
});
