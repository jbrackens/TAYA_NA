/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');
const { generateSignature } = require('./BoomingAPI');

const configuration = config.providers.booming;

describe('Booming Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;
    let callbackSignature;
    let rollbackSignature;
    let body;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'BOO',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
        body = {
          session_id: sessionId,
          player_id: playerId,
          round: 123456789,
          type: 'spin',
          bet: '1.50',
          win: '2.50',
          freespins: { },
          operator_data: 'BOO_TestGame',
          customer_id: 'LuckyDinoCustomerID',
        };

        callbackSignature = generateSignature(configuration.callbackUrl, body, configuration.api.brands.LD.secret, 1564838389);
        rollbackSignature = generateSignature(configuration.rollback_callback, body, configuration.api.brands.LD.secret, 1564838389);
      })
      .expect(200));

    it('can fail post game event request with wrong signature', () =>
      request(app)
        .post('/api/v1/booming/callback')
        .set({
          'Bg-Nonce': 1564838389,
          'Bg-Signature': 'fhjdskhfksdhj',
        })
        .send(body)
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              error: 'custom',
              message: 'Authentication failed',
            },
          });
        })
        .expect(200));

    it('can fail post game event if bet is too big', () =>
      request(app)
        .post('/api/v1/booming/callback')
        .set({
          'Bg-Nonce': 1564838389,
          'Bg-Signature': generateSignature(configuration.callbackUrl, { ...body, bet: '11111.50' }, configuration.api.brands.LD.secret, 1564838389),
        })
        .send({ ...body, bet: '11111.50' })
        .expect((res) => {
          expect(res.body).to.containSubset({
            error: {
              error: 'low_balance',
            },
          });
        })
        .expect(200));

    it('can post game event request', () =>
      request(app)
        .post('/api/v1/booming/callback')
        .set({
          'Bg-Nonce': 1564838389,
          'Bg-Signature': callbackSignature,
        })
        .send(body)
        .expect((res) => {
          expect(res.body).to.containSubset({
            balance: '11.00',
          });
        })
        .expect(200));

    it('can post game event rollback request', () =>
      request(app)
        .post('/api/v1/booming/rollback_callback')
        .set({
          'Bg-Nonce': 1564838389,
          'Bg-Signature': rollbackSignature,
        })
        .send(body)
        .expect((res) => {
          expect(res.body).to.containSubset({
            balance: '10.00',
          });
        })
        .expect(200));
  });
});
