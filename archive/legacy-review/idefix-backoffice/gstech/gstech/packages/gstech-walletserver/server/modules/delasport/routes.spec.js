/* @flow */
const request = require('supertest');
const { v1: uuid } = require('uuid');
const crypto = require('crypto');

const { getPlayerId } = require('gstech-core/modules/helpers');
const api = require('gstech-core/modules/clients/backend-wallet-api');
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.delasport;

describe.skip('delasport wallet api', () => {
  describe('happy path', () => {
    let sessionId;
    let userId;

    const debitTransactionId = uuid();
    const creditTransactionId = uuid();

    const debitTransactionId2 = uuid();
    // const creditTransactionId2 = uuid();

    const debitTransactionId3 = uuid();
    const creditTransactionId3 = uuid();

    let playerId;

    const getHash = (values: any[])=> {
      const concatString = values.join('') + configuration.sharedSecret;

      const hash = crypto.createHash('sha256')
        .update(concatString)
        .digest('hex');

      return hash;
    };

    it('cat get test hash thru the api', async () => {
      await request(app)
        .post('/api/v1/delasport/test-hash')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          hash: getHash([]),
        })
        .expect((res) => {
          userId = res.body.payload.user_id;
          sessionId = res.body.payload.auth_token;

          playerId = getPlayerId(userId).id;
        })
        .expect(200);
    });

    it('fail to access api with wrong api key', async () => {
      await request(app)
        .post(`/api/v1/delasport/member-details`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          auth_token: sessionId,
          hash: 'wrong_hash',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'error',
            payload: {
              code: 1003,
              message: 'Invalid hash',
            },
          });
        })
        .expect(403)
    });

    it('fail to access api with empty api key', async () => {
      await request(app)
        .post(`/api/v1/delasport/member-details`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          auth_token: sessionId,
          hash: '',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'error',
            payload: {
              code: 1002,
              message: 'General error',
            },
          });
        })
        .expect(500)
    });

    it('fail to access api with no api key', async () => {
      await request(app)
        .post(`/api/v1/delasport/member-details`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          auth_token: sessionId,
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'error',
            payload: {
              code: 1002,
              message: 'General error',
            },
          });
        })
        .expect(500)
    });

    it('fail to access api with wrong body format', async () => {
      await request(app)
        .post(`/api/v1/delasport/member-details`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          random: sessionId,
          hash: 'wrong_hash',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'error',
            payload: {
              code: 1002,
              message: 'General error',
            },
          });
        })
        .expect(500)

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(1000);
    });

    it('can get member details', async () => {
      await request(app)
        .post(`/api/v1/delasport/member-details`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          auth_token: sessionId,
          hash: getHash([sessionId]),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {
              user_id: userId,
              currency: 1,
              balance: "10",
            }
          });
        })
        .expect(200)

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(1000);
    });

    it('can get balance', async () => {
      await request(app)
        .get(`/api/v1/delasport/balance?user_id=${userId}&hash=${getHash([userId])}`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {
              balance: '10',
            }
          });
        })
        .expect(200)

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(1000);
    });

    it('fails transaction with insufficient funds', async () => {
      await request(app)
        .post(`/api/v1/delasport/bet-placed`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          bet_transaction_id: debitTransactionId,
          real: 200,
          virtual: 0,
          created_at: new Date('2024-01-01 00:00:00').toISOString(),
          details: '{}',
          hash: getHash([userId, debitTransactionId, 200, 0, new Date('2024-01-01 00:00:00').toISOString(), '{}']),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'error',
            payload: {
              code: 1002,
              message: 'General error',
            },
          });
        })
        .expect(500);
    });

    it('can place bet', async () => {
      await request(app)
        .post(`/api/v1/delasport/bet-placed`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          bet_transaction_id: debitTransactionId,
          real: 2.5,
          virtual: 0,
          created_at: new Date('2024-01-01 00:00:00').toISOString(),
          details: '{}',
          hash: getHash([userId, debitTransactionId, 2.5, 0, new Date('2024-01-01 00:00:00').toISOString() , '{}']),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(750);
    });

    it('can update balance with win status', async () => {
      await request(app)
        .post(`/api/v1/delasport/balance-updated`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          transaction_id: creditTransactionId,
          bet_transaction_id: debitTransactionId,
          amount: 5,
          reason: 6,
          created_at: new Date('2024-01-01 00:00:00').toISOString(),
          hash: getHash([userId, creditTransactionId, debitTransactionId, 5, 6, new Date('2024-01-01 00:00:00').toISOString()]),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(1250);
    });

    it('can place another bet', async () => {
      await request(app)
        .post(`/api/v1/delasport/bet-placed`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          bet_transaction_id: debitTransactionId2,
          real: 3,
          virtual: 0,
          created_at: new Date('2024-01-01 00:00:00').toISOString(),
          details: '{}',
          hash: getHash([userId, debitTransactionId2, 3, 0, new Date('2024-01-01 00:00:00').toISOString() , '{}']),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(950);
    });

    // it('can update balance with loss status', async () => {
    //   await request(app)
    //     .post(`/api/v1/delasport/balance-updated`)
    //     .set('content-type', 'application/x-www-form-urlencoded')
    //     .send({
    //       user_id: userId,
    //       transaction_id: creditTransactionId2,
    //       bet_transaction_id: debitTransactionId2,
    //       details: '{ "status":"loss" }',
    //       amount: 0,
    //       reason: 0,
    //       hash: getHash([userId, creditTransactionId2, debitTransactionId2, 0, 0, '{ "status":"loss" }']),
    //       hash: getHash([userId, creditTransactionId, debitTransactionId, 5, 6, new Date('2024-01-01 00:00:00').toISOString()]),
    //     })
    //     .expect((res) => {
    //       expect(res.body).to.deep.equal({
    //         status: 'success',
    //         payload: {},
    //       });
    //     })
    //     .expect(200);
    //
    //     const balance = await api.getBalance(playerId);
    //     expect(balance.realBalance).to.equal(950);
    // });

    it('can place yet another bet', async () => {
      await request(app)
        .post(`/api/v1/delasport/bet-placed`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          bet_transaction_id: debitTransactionId3,
          real: 4.5,
          virtual: 0,
          created_at: new Date('2024-04-01 00:00:00').toISOString(),
          details: '{}',
          hash: getHash([userId, debitTransactionId3, 4.5, 0, new Date('2024-04-01 00:00:00').toISOString() , '{}']),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(500);
    });

    it('can update balance with tie status', async () => {
      await request(app)
        .post(`/api/v1/delasport/balance-updated`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          transaction_id: creditTransactionId3,
          bet_transaction_id: debitTransactionId3,
          amount: 4.5,
          reason: 9,
          created_at: new Date('2024-04-01 00:00:00').toISOString(),
          hash: getHash([userId, creditTransactionId3, debitTransactionId3, 4.5, 9, new Date('2024-04-01 00:00:00').toISOString()]),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(950);
    });

    it('can update balance with free bet win status', async () => {
      await request(app)
        .post(`/api/v1/delasport/balance-updated`)
        .set('content-type', 'application/x-www-form-urlencoded')
        .send({
          user_id: userId,
          transaction_id: 't_4443271337_1714639727',
          amount: 5,
          reason: 34,
          created_at: new Date('2024-01-01 00:00:00').toISOString(),
          hash: getHash([userId, 't_4443271337_1714639727', 5, 34, new Date('2024-01-01 00:00:00').toISOString()]),
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            status: 'success',
            payload: {},
          });
        })
        .expect(200);

        const balance = await api.getBalance(playerId);
        expect(balance.realBalance).to.equal(1450);
    });
  });
});
