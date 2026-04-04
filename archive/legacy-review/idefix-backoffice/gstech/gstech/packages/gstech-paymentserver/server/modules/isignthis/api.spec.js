// @flow
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');
const { formatUsername } = require('./utils');

// const isxConfig = config.providers.isignthis;

// nock.recorder.rec();
describe('iSignThis API', () => {
  let player;
  let withdrawalTransactionKey;
  const xSigRegex =
    /^v=1; k=IN; n=([A-Za-z0-9+/]{11,12}[=]{0,2}); d=\d{12,13}; s=([A-Za-z0-9+/]{682}[=]{2}|[A-Za-z0-9+/]{683}[=]|[A-Za-z0-9+/]{684})$/;
  const NOCK = {
    WITHDRAW_BATCH_ID: '98549176-5c63-45a8-8c3b-91247093dda7',
  };

  describe('Withdrawals', () => {
    const wdBody = (amnt: { amount: number } = { amount: 100 }) => ({
      player,
      brand: {
        name: 'LuckyDino',
      },
      withdrawal: {
        paymentId: 101086349,
        transactionKey: withdrawalTransactionKey,
        timestamp: '2019-01-23T06:29:52.406Z',
        playerId: 2017118,
        accountId: 1046785,
        ...amnt,
        status: 'accepted',
        account: 'NL78INGB4783095582',
        paymentParameters: {},
        paymentMethodName: 'ISX',
        paymentProvider: 'ISX',
      },
      user: { handle: 'Test', name: 'Test User' },
    });

    beforeEach(() => {
      withdrawalTransactionKey = uuid();
    });

    describe('EUR Withdrawals', () => {
      beforeEach(async () => {
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({ countryId: 'NO', initialBalance: 5000, currencyId: 'EUR' })
          .expect(200)
          .expect((res) => {
            player = res.body.player;
          });
        nock('https://api.stage.payout.isx.money:443', { encodedQueryParams: true })
          .post(
            '/api/v1/batch',
            ({ description }) => description === formatUsername(player.username),
          )
          .matchHeader('content-type', 'application/json; charset=utf-8')
          .matchHeader('domain', 'stage.esportsentertainment.payout')
          .matchHeader('subdomain', 'stage.esportsentertainment.payout-apiKey-esportsentertainment')
          .matchHeader('x-content-signature', (v: string) => xSigRegex.test(v))
          .reply(200, { batch_id: '98549176-5c63-45a8-8c3b-91247093dda7' });
      });

      it('can execute withdrawal', async () =>
        request(api)
          .post('/api/v1/withdraw')
          .send(wdBody())
          .expect(200)
          .expect((res) => {
            expect(res.body).to.deep.equal({
              complete: false,
              id: NOCK.WITHDRAW_BATCH_ID,
              message: 'ISX withdrawal initiated',
              ok: true,
              reject: false,
              parameters: { eurAmount: 100, batchId: NOCK.WITHDRAW_BATCH_ID },
              transaction: { eurAmount: 100, batchId: NOCK.WITHDRAW_BATCH_ID },
            });
          }));
    });

    describe('NOK Withdrawals', () => {
      beforeEach(async () => {
        await request(config.api.backend.url)
          .post('/api/v1/test/init-session')
          .send({ countryId: 'NO', initialBalance: 5000, currencyId: 'NOK' })
          .expect(200)
          .expect((res) => {
            player = res.body.player;
          });
        nock('https://api.stage.payout.isx.money:443', { encodedQueryParams: true })
          .post(
            '/api/v1/batch',
            ({ description }) => description === formatUsername(player.username),
          )
          .matchHeader('content-type', 'application/json; charset=utf-8')
          .matchHeader('domain', 'stage.esportsentertainment.payout')
          .matchHeader('subdomain', 'stage.esportsentertainment.payout-apiKey-esportsentertainment')
          .matchHeader('x-content-signature', (v: string) => xSigRegex.test(v))
          .reply(200, { batch_id: '98549176-5c63-45a8-8c3b-91247093dda7' });
      });

      it('can execute withdrawal', async () =>
        request(api)
          .post('/api/v1/withdraw')
          .send(wdBody({ amount: 1000 }))
          .expect(200)
          .expect((res) => {
            expect(res.body).to.deep.equal({
              complete: false,
              id: NOCK.WITHDRAW_BATCH_ID,
              message: 'ISX withdrawal initiated',
              ok: true,
              reject: false,
              parameters: { eurAmount: 100, batchId: NOCK.WITHDRAW_BATCH_ID },
              transaction: { eurAmount: 100, batchId: NOCK.WITHDRAW_BATCH_ID },
            });
          }));
    });
  });
});
