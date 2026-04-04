/* @flow */
const nock = require('nock');  
const request = require('supertest');  

const api = require('../../api-server');

// nock.recorder.rec();
describe('Siru API', () => {
  nock('https://staging.sirumobile.com:443', { encodedQueryParams: true })
    .post('/payment.json', { signature: '608aa2dd0df2e1eb785006eb8bd3f1f60ce141e9c743355e6d3ad7786adf4a83da4e8ed30e8e44dc980a9f40f131fbd04cef6fc0327317fec93da390fe1467ab', variant: 'variant3', merchantId: 40, submerchantReference: 'luckydino', purchaseCountry: 'FI', purchaseReference: 'daf94940-1ef2-11e9-97c9-253a956a0f69', customerEmail: 'test@gmail.com', customerLocale: 'fi_FI', basePrice: '194.00', customerReference: 'LD_Test.User_123', redirectAfterSuccess: 'http://127.0.0.1:3003/ok', redirectAfterFailure: 'http://127.0.0.1:3003/fail', redirectAfterCancel: 'http://127.0.0.1:3003/fail', notifyAfterSuccess: 'http://localhost:3006/api/v1/siru/process/LD', notifyAfterFailure: 'http://localhost:3006/api/v1/siru/process/LD', notifyAfterCancel: 'http://localhost:3006/api/v1/siru/process/LD' }) // eslint-disable-line
    .reply(201, { success: true, purchase: { uuid: '5f0f470a-60f4-4c83-876c-fb0cdd0b2997', redirect: 'https://staging.sirumobile.com/payment/wallet/5f0f470a-60f4-4c83-876c-fb0cdd0b2997' } }, ['Server',
      'nginx/1.14.2',
      'Content-Type',
      'application/json',
      'Transfer-Encoding',
      'chunked',
      'Connection',
      'close',
      'X-Powered-By',
      'PHP/7.1.26',
      'Cache-Control',
      'no-cache, private',
      'Date',
      'Tue, 12 Mar 2019 10:38:30 GMT',
      'Set-Cookie',
      'identity=4589ab66-c8df-4d4c-85ec-039523a43b79; expires=Mon, 31-Dec-2029 23:59:59 GMT; Max-Age=341068889; path=/; secure; httponly']);

  it('can execute deposit', async () =>
    request(api)
      .post('/api/v1/deposit')
      .send({
        player: {
          id: 2017118,
          username: 'LD_Test.User_123',
          email: 'test@gmail.com',
          currencyId: 'EUR',
          brandId: 'LD',
          countryId: 'FI',
        },
        urls: {
          ok: 'http://127.0.0.1:3003/ok',
          failure: 'http://127.0.0.1:3003/fail',
        },
        brand: {
          name: 'LuckyDino',
        },
        deposit: {
          paymentId: 101086349,
          transactionKey: 'daf94940-1ef2-11e9-97c9-253a956a0f69',
          timestamp: '2019-01-23T06:29:52.406Z',
          playerId: 2017118,
          accountId: 1046785,
          amount: 19400,
          status: 'accepted',
          account: 'foo@bar.com',
          paymentParameters: {},
          accountParameters: {},
          paymentMethodName: 'SiruMobile',
          paymentProvider: 'SiruMobile',
        },
      })
      .expect(200)
      .expect(res =>
        expect(res.body).to.containSubset({
          requiresFullscreen: false,
          url: 'https://staging.sirumobile.com/payment/wallet/5f0f470a-60f4-4c83-876c-fb0cdd0b2997',
        })));
});
