/* @flow */
const nock = require('nock'); // eslint-disable-line
const request = require('supertest');  
const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('QPay API', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  // const withdrawTransactionKey = '5ba0f811-4f98-11e9-82db-311c7f522372';
  // const withdrawTransactionId = uuid();
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
        player = res.body.player;
        sessionId = res.body.token;
        player.countryId = 'IN';
        player.mobilePhone = '918130308778';
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
          amount: 500000,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'QPay',
          paymentProvider: 'QPay',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res => {
        expect(res.body.html).to.contain('https://test.avantgardepayments.com/agcore/payment')
        expect(res.body).to.containSubset({ requiresFullscreen: true, });
      }));

  // FIXME: test still not working :(
  // it('can execute withdrawal', async () =>
  //   request(api)
  //     .post('/api/v1/withdraw')
  //     .send({
  //       player,
  //       brand: {
  //         name: 'LuckyDino',
  //       },
  //       withdrawal: {
  //         paymentId: 101086349,
  //         transactionKey: withdrawTransactionKey,
  //         timestamp: '2019-01-23T06:29:52.406Z',
  //         playerId: 2017118,
  //         accountId: 1046785,
  //         amount: 19400,
  //         status: 'accepted',
  //         account: player.email,
  //         paymentParameters: {},
  //         accountParameters: {
  //           accountNo: '119601523756',
  //           ifscCode: 'ICIC0001196',
  //           bankName: 'kotak',
  //           accountHolderName: 'ABCD',
  //           txnType: 'IMPS',
  //           accountType: 'Saving',
  //         },
  //         paymentMethodName: 'QPay',
  //         paymentProvider: 'QPay',
  //       },
  //       client: {
  //         ipAddress: '10.110.11.11',
  //         userAgent: 'Hugo Weaving',
  //         isMobile: false,
  //       },
  //       user: { handle: 'Test', name: 'Test User' },
  //     })
  //     .expect(200)
  //     .expect((res) => {
  //       expect(res.body).to.deep.equal({
  //         complete: false,
  //       //  id: withdrawTransactionId,
  //         message: 'PAYABLE',
  //         ok: true,
  //         reject: false,
  //         parameters: {
  //           paymentHandleToken: 'PHqViUfMNK9uUPCQ',
  //         },
  //       });
  //     }));
});
