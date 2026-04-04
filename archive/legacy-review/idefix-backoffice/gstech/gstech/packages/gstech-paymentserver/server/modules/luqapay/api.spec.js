/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('Luqapay API', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  const withdrawTransactionKey = uuid();
  const withdrawTransactionId = uuid();
  before(async () => {
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
      .send({ depositMethod: 'COMMUNITYBANK_Luqapay', amount: 5000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
      .post('/v2/auth/merchant/token', { apiKey: '087b151fb5bd44fdade70a393cd96d63' })
      .times(2)
      .reply(
        200,
        {
          accessToken:
            'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxNDZiZTUyOTQ5MzM0MWI5YTI1NzcxNWI3NTIyOTM0MiIsImF1ZCI6IndhbGxldCIsIm5iZiI6MTYyMzA2NjM5NCwicmVzb3VyY2UiOiJNRVJDSEFOVCIsInJvbGVzIjpbIk1FUkNIQU5UX1BBWV9CWV9MSU5LIiwiVVNFUl9QQVNTV09SRF9DSEFOR0UiLCJVU0VSX0xJU1QiLCJUUkFOU0FDVElPTl9BQ1RJVklUWSIsIlVTRVJfQUNUSVZBVElPTiIsIlRSQU5TQUNUSU9OX0xJU1QiLCJKRVRPTl9XQUxMRVRfV0lUSERSQVciLCJNRVJDSEFOVF9HRVQiLCJXSVRIRFJBVyIsIklQTl9SRVNFTkQiLCJXSVRIRFJBV19CVUxLIiwiQVBQX0FDQ0VTUyIsIk1FUkNIQU5UX1RSQU5TQUNUSU9OX0RFVEFJTF9SRVBPUlQiLCJDUllQVE9fV0lUSERSQVciLCJLWUNfVVBMT0FEX0xJU1QiLCJCQU5LX1RSQU5TRkVSIiwiTUVSQ0hBTlRfRE9DVU1FTlRTIiwiU1RBVElTVElDIl0sImV4cCI6MTYyMzA2ODE5NCwicGFydHkiOiI4MDMifQ.MgLzSahy24HVuo1dSknfV2seWvmXAz2roRZJQQ_6QFt1l54QkgSXcLsXHeHjWzYqHqCdhsGhpvoRrB2_cCHsrg',
          expiryTimeoutInMinutes: 30,
        },
      );

    nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
      .post('/v2/communityBankTransferAdvanced/banks', { country: 'NO' })
      .reply(
        200,
        {
          code: '00',
          message: 'Approved',
          status: null,
          error: null,
          availableBanks: [
            { bankName: 'SpareBank 1 Modum', swiftCode: 'MODUNO21' },
            { bankName: 'DNB', swiftCode: 'DNBANOKKXXX' },
          ],
        },
      );

    nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
      .post('/v2/communityBankTransferAdvanced/availableAmount', {
        maxAmount: 50,
        minAmount: '0',
        swiftCode: 'DNBANOKKXXX',
      })
      .reply(200, { code: '00', message: 'Approved', activeAmount: [], error: null });

    nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
      .post('/v2/communityBankTransferAdvanced/availableAmount', {
        maxAmount: 50,
        minAmount: '0',
        swiftCode: 'MODUNO21',
      })
      .reply(200, { code: '00', message: 'Approved', activeAmount: [], error: null });

      nock('https://sandbox-wallet.luqapay.com:443', { encodedQueryParams: true })
        .post('/v2/withdraw/bank', {
          amount: 1,
          country: 'NO',
          currency: 'EUR',
          email: player.email,
          firstName: 'Jack',
          lastName: 'Sparrow',
          iban: 'NO93 8601 1117 947',
          referenceNo: withdrawTransactionKey,
          swiftCode: 'MODUNO21',
        })
        .reply(200, {
          transactionId: withdrawTransactionId,
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
          paymentMethod: 'COMMUNITYBANK',
          paymentProvider: 'Luqapay',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body.html.includes('DNBANOKKXXX'));
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
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
            amount: 100,
            status: 'accepted',
            account: 'NO93 8601 1117 947',
            paymentParameters: {},
            accountParameters: {
              swiftCode: 'MODUNO21',
            },
            paymentMethodName: 'COMMUNITYBANK',
            paymentProvider: 'Luqapay',
          },
          user: { handle: 'Test', name: 'Test User' },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.deep.equal({
            complete: false,
            id: withdrawTransactionId,
            message: 'Luqapay withdrawal initiated',
            ok: true,
            reject: false,
          });
        }));
});
