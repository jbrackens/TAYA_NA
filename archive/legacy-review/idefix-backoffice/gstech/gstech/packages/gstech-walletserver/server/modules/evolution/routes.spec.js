/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');

describe.skip('Evolution Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'EVO',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
      })
      .expect(200));

    it('can fail with wrong authToken', () =>
      request(app)
        .post('/api/v1/evolution/check?authToken=123456789')
        .send({
          sid: sessionId,
          userId: playerId,
          channel: {
            type: 'P',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INVALID_TOKEN_ID',
          });
        })
        .expect(200));

    it('can post check request', () =>
      request(app)
        .post('/api/v1/evolution/check?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          channel: {
            type: 'P',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            sid: sessionId,
          });
        })
        .expect(200));

    it('can fail post check request with wrong userId', () =>
      request(app)
        .post('/api/v1/evolution/check?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: 'LD_565656554',
          channel: {
            type: 'P',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INVALID_PARAMETER',
          });
        })
        .expect(200));

    it('can post balance request', () =>
      request(app)
        .post('/api/v1/evolution/balance?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          game: null,
          currency: 'EUR',
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 10,
            bonus: 0,
          });
        })
        .expect(200));

    it('can fail post balance request with wrong user id', () =>
      request(app)
        .post('/api/v1/evolution/balance?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: '75757575',
          game: null,
          currency: 'EUR',
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INVALID_PARAMETER',
          });
        })
        .expect(200));

    it('can fail post debit request if bet it too big', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '10000.50',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INSUFFICIENT_FUNDS',
          });
        })
        .expect(200));

    it('can post debit request', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '1.55',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 8.45,
            bonus: 0,
          });
        })
        .expect(200));

    it('can fail post debit request if doing it twice', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '1.55',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'BET_ALREADY_EXIST',
          });
        })
        .expect(200));

    it('can fail post debit request if sid is wrong', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: 'wrong sessionId',
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '1.55',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INVALID_SID',
          });
        })
        .expect(200));

    it('can post credit request', () =>
      request(app)
        .post('/api/v1/evolution/credit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'C1459zzz',
            refId: '1459zzz',
            amount: '2.80',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 11.25,
            bonus: 0,
          });
        })
        .expect(200));

    it('can post credit request (no win)', () =>
      request(app)
        .post('/api/v1/evolution/credit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'C1459zzzzzzz',
            refId: '1459zzz',
            amount: '0.00',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 11.25,
            bonus: 0,
          });
        })
        .expect(200));

    it('can post debit request one more time', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfw53454353irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: '74839753498',
            refId: '4234242',
            amount: '1.25',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 10.00,
            bonus: 0,
          });
        })
        .expect(200));

    it('can post cancel request', () =>
      request(app)
        .post('/api/v1/evolution/cancel?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfw53454353irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: '74839753498',
            refId: '4234242',
            amount: '1.25',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 11.25,
            bonus: 0,
          });
        })
        .expect(200));
  });

  describe('with active session and disallow bonus balance', () => {
    let sessionId;
    let playerId;
    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'EVO',
        initialBalance: 500,
        initialBonusBalance: 500,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
      })
      .expect(200));

    it('can post debit request', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '4.99',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'OK',
            balance: 0.01,
            bonus: 5,
          });
        })
        .expect(200));

    it('can fail post debit request if bet is bigger than real player balance', () =>
      request(app)
        .post('/api/v1/evolution/debit?authToken=c6514173-5543-4435-a389-13d895907f0c')
        .send({
          sid: sessionId,
          userId: playerId,
          currency: 'EUR',
          game: {
            id: '7kfwqku4jb4mtas1n4k4irqa',
            type: 'poker',
            details: {
              table: {
                id: 'aaabbbcccdddeee111',
                vid: 'aaabbbcccdddeee111',
              },
            },
          },
          transaction: {
            id: 'D1459zzz',
            refId: '1459zzz',
            amount: '0.02',
          },
          uuid: 'ce186440-ed92-11e3-ac10-0800200c9a66',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            status: 'INSUFFICIENT_FUNDS',
            balance: 0.01,
            bonus: 5,
          });
        })
        .expect(200));

  });
});
