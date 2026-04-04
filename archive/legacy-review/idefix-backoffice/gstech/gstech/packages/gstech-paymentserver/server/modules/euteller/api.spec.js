/* @flow */
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const nock = require('nock');  
const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();

describe('Euteller API', () => {
  let player;
  let sessionId;

  let depositTransactionKey;

  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({ countryId: 'FI' })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'BankTransfer_Euteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    nock('https://payment.euteller.net:443', { encodedQueryParams: true })
      .get(`/siirto/proxyStatus/${player.mobilePhone}`)
      .reply(200, { userRegistered: true });
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
          playerId: player.id,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: '',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Euteller',
        },
        params: {},
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
        })));

  nock('https://payment.euteller.com:443', { encodedQueryParams: true })
    .post(q => q.indexOf('/withdraw/v1?transactionid=101086349&customer=LuckyDino_dev&amount=194.00&end_user%5Biban%5D=EUTxxxxx&end_user%5Blogin%5D=LD_Jack.Sparrow_') === 0)
    .reply(200, {
      transactionid: '12',
      amount: '15.00',
      security: '328e99d4f6e5925f53f5166a35144b46de1900663151ad6f35c854cb4ea425c9',
      end_user: {
        login: 'user@yoursite',
        iban: 'FI2112345600000785',
      },
      bankreference: '1243604',
      ts: '2015-11-19 13:10:57',
    });

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
          transactionKey: uuid(),
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'FI2112345600000785',
          paymentParameters: { },
          accountParameters: {
            iban_hashed: 'EUTxxxxx',
          },
          paymentMethodName: 'BankTransfer',
          paymentProvider: 'Euteller',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: false,
          id: '1243604',
          message: 'WD submitted',
          ok: true,
          reject: false,
        });
      }));

  nock('https://payment.euteller.com:443', { encodedQueryParams: true })
    .post(q => q.indexOf('/withdraw/v1?transactionid=101086350&customer=LuckyDino_dev&amount=194.00&end_user%5Biban%5D=FI2112345600000785&end_user%5Blogin%5D=LD_Jack.Sparrow_') === 0)
    .reply(200, {
      status: false,
      error: [
        {
          transactionid: 'transactionid already used',
        },
      ],
      message_id: 1555744648.9564,
      security: 'ee8bc683fb1a4b359554f1f2af2f24607f32ed0dd849c79e4648cbeeae25e4ac',
      ts: '2019-04-20 10:17:31',
    });

  nock('https://payment.euteller.com:443', { encodedQueryParams: true })
    .get('/merchantapi/v1?customer=LuckyDino_dev&action=withdrawstatus&security=ea5c7aae5517f2e0e13bc9bafaa2eea6eb997aa171aa631ec381e5c86bfc1dc4&orderid=101086350')
    .reply(200, {
      response: {
        orderid: '101320887',
        bankref: '72402723832',
        amount: '258.02',
      },
      status: 'Withdraw paid',
      status_code: 200,
      action: 'withdrawstatus',
      customer: 'LuckyDinoGaming',
      response_date_time: '2019-04-21 09:23:00',
    });

  it('can execute withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player,
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086350,
          transactionKey: uuid(),
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'FI2112345600000785',
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'BankTransfer',
          paymentProviderId: 4,
          paymentProvider: 'Euteller',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: true,
          message: 'WD submitted with network failure',
          id: '72402723832',
          ok: true,
          reject: false,
        });
      }));

  nock('https://payment.euteller.com:443', { encodedQueryParams: true })
    .post(q => q.indexOf('/withdraw/v1?transactionid=101086350&customer=LuckyDino_dev&amount=194.00&end_user%5Biban%5D=&end_user%5Blogin%5D=LD_Jack.Sparrow_') === 0)
    .reply(200, {
      transactionid: '12',
      amount: '15.00',
      security: '328e99d4f6e5925f53f5166a35144b46de1900663151ad6f35c854cb4ea425c9',
      end_user: {
        login: 'user@yoursite',
      },
      bankreference: '1243604',
      ts: '2015-11-19 13:10:57',
    });

  it('can execute Siirto withdrawal', async () =>
    request(api)
      .post('/api/v1/withdraw')
      .send({
        player,
        brand: {
          name: 'LuckyDino',
        },
        withdrawal: {
          paymentId: 101086350,
          transactionKey: uuid(),
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: `+${player.mobilePhone}`,
          paymentParameters: { },
          accountParameters: { },
          paymentMethodName: 'Siirto',
          paymentProvider: 'Euteller',
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: false,
          id: '1243604',
          message: 'WD submitted',
          ok: true,
          reject: false,
        });
      }));
});
