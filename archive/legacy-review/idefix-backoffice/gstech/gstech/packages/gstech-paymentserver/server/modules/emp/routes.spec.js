/* @flow */
const nock = require('nock'); // eslint-disable-line
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const app = require('../../index');
const config = require('../../../config');

// nock.recorder.rec();
describe('EMP Callback API', () => {
  let player;
  let sessionId;
  let transactionKey;

  const transactionId = uuid();
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'NE',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.token;
        player = res.body.player;
      })
      .expect(200);

    await request(config.api.backend.url)
      .post('/api/LD/v1/deposit')
      .send({ depositMethod: 'VisaVoucher_EMP2', amount: 50000, bonusId: 1001 })
      .set({ 'X-Authentication': true, Authorization: `Token ${sessionId}` })
      .expect(200)
      .expect((res) => {
        transactionKey = res.body.transactionKey;
      });
  });

  it('can handle callback', async () =>
    request(app)
      .post('/api/v1/emp/process')
      .send({
        '3DSecure': 'no',
        Amount: '3.13',
        Date: '2019-04-23 10:36:10',
        Message: 'Payment was successful',
        OneClick: 'no',
        OperationType: 'payment',
        Reference: transactionId,
        Status: 'captured',
        Tid: transactionKey,
        UserId: player.username,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({
          ok: true,
        });
      }));
});
