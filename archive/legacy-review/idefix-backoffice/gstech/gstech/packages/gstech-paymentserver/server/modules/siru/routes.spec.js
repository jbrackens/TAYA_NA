/* @flow */
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const app = require('../../index');
const config = require('../../../config');
const { calculateSignature } = require('./utils');

// nock.recorder.rec();
describe('Siru Callback API', () => {
  let player;
  let sessionId;
  let transactionKey;
  let requestBody;

  const transactionId = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
        countryId: 'FI',
        currencyId: 'USD',
      })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'SiruMobile_SiruMobile', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });

    requestBody = {
      siru_uuid: transactionId,
      siru_merchantId: 40,
      siru_submerchantReference: 'luckydino',
      siru_purchaseReference: transactionKey,
      siru_event: 'success',
      siru_signature: '',
    };

    const cConf = config.providers.siru.brands.LD.countries.FI;
    const sig1 = calculateSignature(
      requestBody,
      cConf,
      'siru_uuid,siru_merchantId,siru_submerchantReference,siru_purchaseReference,siru_event'.split(
        ',',
      ),
    );
    const sig2 = calculateSignature(
      requestBody,
      cConf,
      'siru_merchantId,siru_submerchantReference,siru_purchaseReference'.split(','),
    );

    requestBody.siru_signature = sig1;

    nock('https://staging.sirumobile.com:443', { encodedQueryParams: true })
      .get('/payment/byPurchaseReference.json')
      .query({ signature: sig2, merchantId: '40', purchaseReference: transactionKey, submerchantReference: 'luckydino' })
      .reply(200, { purchases: [{ uuid: transactionId, submerchantReference: 'luckydino', customerReference: 'LD_Test.User_123', purchaseReference: transactionKey, status: 'confirmed', basePrice: '194.00', finalPrice: '194.00', currency: 'EUR', createdAt: '2019-03-12T10:38:30+0000', startedAt: null, finishedAt: '2019-03-12T10:49:01+0000', customerNumber: null }] }, ['Server',
        'nginx/1.14.2',
        'Content-Type',
        'application/json',
        'Transfer-Encoding',
        'chunked',
        'Connection',
        'close',
        'Vary',
        'Accept-Encoding',
        'X-Powered-By',
        'PHP/7.1.26',
        'Cache-Control',
        'no-cache, private',
        'Date',
        'Tue, 12 Mar 2019 13:36:41 GMT',
        'Set-Cookie',
        'identity=96b0a5b9-5041-4bfc-bebd-d3cfbbd19b92; expires=Mon, 31-Dec-2029 23:59:59 GMT; Max-Age=341058198; path=/; secure; httponly']);
  });

  it('can handle callback', async () =>
    request(app)
      .post('/api/v1/siru/process/LD')
      .send(requestBody)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          playerId: player.id,
          balance: {
            balance: 20400,
            bonusBalance: 19400,
            currencyId: 'USD',
            numDeposits: 1,
            brandId: 'LD',
          },
        });
      }));
});
