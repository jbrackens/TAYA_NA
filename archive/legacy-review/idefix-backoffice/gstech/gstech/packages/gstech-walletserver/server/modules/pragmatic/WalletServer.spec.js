/* @flow */
const request = require('supertest');  
const app = require('../../index');
const config = require('../../../config');
const { calculateHash } = require('./hash');

const configuration = config.providers.pragmatic;

const req = (params: mixed) =>
  ({ ...params, hash: calculateHash(configuration.brands.LD.secretKey, params) });

describe('Pragmatic Play WalletServer', () => {
  describe('with active session', () => {
    let sessionId;
    let player;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'PP',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('returns an error when doing a request with invalid hash', () =>
      request(app)
        .post('/api/v1/pragmatic/authenticate.html')
        .type('form')
        .send({
          providerId: 'PragmaticPlay',
          token: sessionId,
          hash: 'xxx',
        })
        .expect(res =>
          expect(res.body).to.containSubset({
            error: '5',
            description: 'Invalid hash',
          }))
        .expect(200));

    it('can authenticate', () =>
      request(app)
        .post('/api/v1/pragmatic/authenticate.html')
        .type('form')
        .send(req({
          providerId: 'PragmaticPlay',
          token: sessionId,
        }))
        .expect(res =>
          expect(res.body).to.containSubset({
            error: '0',
            description: 'Success',
            cash: '10.00',
            bonus: '0.00',
            userId: player.username,
          }))
        .expect(200));
    it('can get balance', () =>
      request(app)
        .post('/api/v1/pragmatic/balance.html')
        .type('form')
        .send(req({
          hash: 'xxx',
          providerId: 'PragmaticPlay',
          userId: player.username,
        }))
        .expect(res =>
          expect(res.body).to.containSubset({
            error: '0',
            description: 'Success',
            cash: '10.00',
            bonus: '0.00',
            currency: 'EUR',
          }))
        .expect(200));
    it('returns an error when bet over balance', () =>
      request(app)
        .post('/api/v1/pragmatic/bet.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5d',
          gameId: 'vs20cm',
          amount: '100.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect(res =>
          expect(res.body).to.containSubset({
            error: '1',
            description: 'Insufficient balance',
          }))
        .expect(200));
    it('can place a bet', () =>
      request(app)
        .post('/api/v1/pragmatic/bet.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5d',
          gameId: 'vs20cm',
          amount: '5.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '5.00',
            bonus: '0.00',
            usedPromo: '0',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
    it('credits win', () =>
      request(app)
        .post('/api/v1/pragmatic/result.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5e',
          gameId: 'vs20cm',
          amount: '15.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '20.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
    it('closes game round', () =>
      request(app)
        .post('/api/v1/pragmatic/endRound.html')
        .type('form')
        .send(req({
          gameId: 'vs20cm',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '20.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));

    it('places a bet and cancels it', async () => {
      await request(app)
        .post('/api/v1/pragmatic/bet.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5b',
          gameId: 'vs20cm',
          amount: '5.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '15.00',
            bonus: '0.00',
            usedPromo: '0',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200);
      await request(app)
        .post('/api/v1/pragmatic/refund.html')
        .type('form')
        .send(req({
          reference: '585c1306f89c56f5ecfc2f5b',
          providerId: 'PragmaticPlay',
          userId: player.username,
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            error: '0',
            description: 'Success',
          });
        })
        .expect(200);
    });
    it('credits credits freespins win', () =>
      request(app)
        .post('/api/v1/pragmatic/result.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5g',
          bonusCode: 'a123-123123',
          gameId: 'vs20cm',
          amount: '15.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '35.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
    it('ignores bonusWin request', () =>
      request(app)
        .post('/api/v1/pragmatic/bonusWin.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5g',
          bonusCode: 'a123-123123',
          amount: '15.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '35.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
    it('credits credits jackpot win', () =>
      request(app)
        .post('/api/v1/pragmatic/jackpotWin.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5f',
          gameId: 'vs20cm',
          amount: '15.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188802',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '50.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
    it('retried win returns current balance', () =>
      request(app)
        .post('/api/v1/pragmatic/result.html')
        .type('form')
        .send(req({
          roundDetails: 'spin',
          reference: '585c1306f89c56f5ecfc2f5e',
          gameId: 'vs20cm',
          amount: '15.0',
          providerId: 'PragmaticPlay',
          userId: player.username,
          roundId: '5103188801',
          timestamp: Date.now(),
        }))
        .expect((res) => {
          expect(res.body.transactionId).to.not.equal(null);
          expect(res.body).to.containSubset({
            currency: 'EUR',
            cash: '50.00',
            bonus: '0.00',
            error: '0',
            description: 'Success',
          });
        })
        .expect(200));
  });
});
