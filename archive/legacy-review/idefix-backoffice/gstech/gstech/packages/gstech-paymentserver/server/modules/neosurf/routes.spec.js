/* @flow */
const crypto = require('crypto');
const nock = require('nock');  
const request = require('supertest');  
const { v1: uuid } = require('uuid');
const api = require('gstech-core/modules/clients/backend-payment-api');

const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.neosurf;
// nock.recorder.rec();
describe('Neosurf Callbacks API', () => {
  let sessionId;
  let transactionKey;

  nock('https://sandbox-walletapi.jeton.com:443', { encodedQueryParams: true })
    .post('/api/v3/integration/merchants/customers', { customer: '12345678' })
    .reply(200, { firstName: 'John', lastName: 'Doe', dateOfBirth: '1985' });

  beforeEach(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({})
      .expect((res) => {
        sessionId = res.body.token;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'Neosurf_Neosurf', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('can handle payment complete', async () => {
    const parameters = {
      amount: '50000',
      created: '2021-05-17 09:32:57',
      currency: 'eur',
      errorCode: '',
      errorMessage: '',
      merchantId: '24842',
      merchantTransactionId: transactionKey,
      methodChargedAmount: '10000',
      methodCurrency: 'EUR',
      methodExpiry: '01/01/2032',
      methodId: '5554605',
      methodLabel: '5554605',
      methodName: 'neosurf',
      status: 'ok',
      subMerchantId: 'https://luckydino.com',
      transaction3d: '',
      transactionId: uuid(),
    };
    const data = Object.values(parameters).map(v => v).join('') + configuration.secret;
    const hash = crypto.createHash('sha512').update(data).digest('hex');

    await request(app)
      .post('/api/v1/neosurf')
      .send({
        ...parameters,
        hash,
      })
      .expect(200);
    const { balance } = await api.getDepositAlt(transactionKey);
    expect(balance.balance).to.equal(50000);
  });
});
