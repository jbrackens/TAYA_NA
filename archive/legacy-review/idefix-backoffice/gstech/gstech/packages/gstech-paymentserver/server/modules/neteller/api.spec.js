/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const api = require('../../api-server');
const config = require('../../../config');

// nock.recorder.rec();
describe('Neteller API (Paysafe API)', () => {
  let player;
  let sessionId;

  let depositTransactionKey;
  let withdrawTransactionKey; // = '5ba0f811-4f98-11e9-82db-311c7f522372';
  const depositTransactionId = uuid();
  const withdrawTransactionId = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neteller_Neteller', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        depositTransactionKey = res.body.transactionKey;
      });

    await request(config.api.backend.url)
      .post(`/api/LD/v1/deposit/${depositTransactionKey}`)
      .send({
        amount: 50000,
        externalTransactionId: depositTransactionId,
        account: 'foo@bar.com',
        accountHolder: null,
        message: 'INITIATED',
        rawTransaction: {},
      })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/test-withdraw')
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .send({
        amount: 19400,
        provider: 'Neteller',
      })
      .expect((res) => {
        withdrawTransactionKey = res.body.transactionKey;
      })
      .expect(200);

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/paymenthandles', { merchantRefNum: depositTransactionKey, transactionType: 'PAYMENT', paymentType: 'NETELLER', neteller: { consumerId: player.email }, amount: 19400, currencyCode: 'EUR', customerIp: '10.110.11.11', billingDetails: { street: 'Fugger Strasse 56', city: 'Dessau', zip: '06820', country: 'DE' }, returnLinks: [{ rel: 'default', href: 'http://127.0.0.1:3003/ok' }, { rel: 'on_completed', href: 'http://127.0.0.1:3003/ok' }, { rel: 'on_failed', href: 'http://127.0.0.1:3003/fail' }] })  
      .reply(201, { id: depositTransactionId, paymentType: 'NETELLER', paymentHandleToken: 'PHblGmofpBF8V5KZ', merchantRefNum: depositTransactionKey, currencyCode: 'EUR', txnTime: '2020-02-20T11:17:02.000+0000', billingDetails: { street: 'Fugger Strasse 56', city: 'Dessau', zip: '06820', country: 'DE' }, customerIp: '10.110.11.11', status: 'INITIATED', links: [{ rel: 'redirect_payment', href: 'https://api.test.paysafe.com/alternatepayments/v1/redirect?accountId=75904_EUR&paymentHandleId=bdf80100-ca71-4355-af03-874ba591a55d&token=eyJhbGciOiJIUzI1NiJ9.eyJhY2QiOiI3NTkwNF9FVVIiLCJweWQiOiJiZGY4MDEwMC1jYTcxLTQzNTUtYWYwMy04NzRiYTU5MWE1NWQiLCJleHAiOjE1ODIxOTkyMjJ9.-Q-92K5O0X1fKDOz_PebnO2ZJAbE-IkMSLbmJj33V0g' }], liveMode: false, usage: 'SINGLE_USE', action: 'REDIRECT', executionMode: 'SYNCHRONOUS', amount: 19400, timeToLiveSeconds: 899, gatewayResponse: { orderId: 'ORD_ae4f9089-7598-4359-81cc-ab497e3855a9', totalAmount: '19400', currency: 'EUR', lang: 'en_US', status: 'pending', processor: 'NETELLER' }, returnLinks: [{ rel: 'default', href: 'http://127.0.0.1:3003/ok' }, { rel: 'on_completed', href: 'http://127.0.0.1:3003/ok' }, { rel: 'on_failed', href: 'http://127.0.0.1:3003/fail' }], transactionType: 'PAYMENT', updatedTime: '2020-02-20T11:17:02Z', statusTime: '2020-02-20T11:17:02Z', neteller: { consumerId: player.email } }); // eslint-disable-line max-len

    nock('https://api.test.paysafe.com:443', { encodedQueryParams: true })
      .post('/paymenthub/v1/paymenthandles', { merchantRefNum: withdrawTransactionKey, transactionType: 'STANDALONE_CREDIT', paymentType: 'NETELLER', neteller: { consumerId: player.email }, amount: 19400, currencyCode: 'EUR', customerIp: '10.110.11.11', billingDetails: { street: 'Fugger Strasse 56', city: 'Dessau', zip: '06820', country: 'DE' }, returnLinks: [] })  
      .reply(201, { id: withdrawTransactionId, paymentType: 'NETELLER', paymentHandleToken: 'PHqViUfMNK9uUPCQ', merchantRefNum: withdrawTransactionKey, currencyCode: 'EUR', txnTime: '2020-02-20T11:24:10.000+0000', billingDetails: { street: 'Fugger Strasse 56', city: 'Dessau', zip: '06820', country: 'DE' }, customerIp: '10.110.11.11', status: 'PAYABLE', liveMode: false, usage: 'SINGLE_USE', action: 'NONE', executionMode: 'SYNCHRONOUS', amount: 19400, timeToLiveSeconds: 899, gatewayResponse: { processor: 'NETELLER' }, transactionType: 'STANDALONE_CREDIT', updatedTime: '2020-02-20T11:24:10Z', statusTime: '2020-02-20T11:24:10Z', neteller: { consumerId: player.email } });  
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
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'Neteller',
          paymentProvider: 'Neteller',
        },
        params: {
          accountId: player.email,
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: true,
          url: 'https://api.test.paysafe.com/alternatepayments/v1/redirect?accountId=75904_EUR&paymentHandleId=bdf80100-ca71-4355-af03-874ba591a55d&token=eyJhbGciOiJIUzI1NiJ9.eyJhY2QiOiI3NTkwNF9FVVIiLCJweWQiOiJiZGY4MDEwMC1jYTcxLTQzNTUtYWYwMy04NzRiYTU5MWE1NWQiLCJleHAiOjE1ODIxOTkyMjJ9.-Q-92K5O0X1fKDOz_PebnO2ZJAbE-IkMSLbmJj33V0g',
        })));

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
          amount: 19400,
          status: 'accepted',
          account: player.email,
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'Neteller',
          paymentProvider: 'Neteller',
        },
        client: {
          ipAddress: '10.110.11.11',
          userAgent: 'Hugo Weaving',
          isMobile: false,
        },
        user: { handle: 'Test', name: 'Test User' },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          complete: false,
          id: withdrawTransactionId,
          message: 'PAYABLE',
          ok: true,
          reject: false,
          parameters: {
            paymentHandleToken: 'PHqViUfMNK9uUPCQ',
          },
        });
      }));
});
