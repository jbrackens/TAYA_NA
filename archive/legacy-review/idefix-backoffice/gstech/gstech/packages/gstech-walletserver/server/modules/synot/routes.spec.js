/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');
const { signBody } = require('./routes');

describe('Synot Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let player;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'SYN',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        player = res.body.player;
      })
      .expect(200));

    it('can fail with wrong signature', () => {
      const body = signBody({
        apiKey: 'testApiKey',
        token: sessionId,
        requestId: 'ce756ea3402645c99dbdabeba2c426ec',
      });
      return request(app)
        .post('/api/v1/synot/getSession')
        .send({ ...body, signature: 'wrong signature' })
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            code: 3004,
            message: 'Invalid signature.',
          }));
        })
        .expect(500);
    });

    it('can fail with wrong session', () => {
      const body = signBody({
        apiKey: 'testApiKey',
        token: 'wrong token',
        requestId: 'ce756ea3402645c99dbdabeba2c426ec',
      });
      return request(app)
        .post('/api/v1/synot/getSession')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            code: 3005,
            message: 'Invalid token.',
          }));
        })
        .expect(500);
    });

    it('can get session', () => {
      const body = signBody({
        apiKey: 'testApiKey',
        token: sessionId,
        requestId: 'ce756ea3402645c99dbdabeba2c426ec',
      });
      return request(app)
        .post('/api/v1/synot/getSession')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            playerId: getExternalPlayerId(player),
            playerName: player.username,
            language: player.languageId,
            currency: player.currencyId,
            realBalance: 10.00,
            bonusBalance: 0,
            checkInterval: '',
            checkStart: '',
            exitUrl: '',
            historyUrl: '',
            token: sessionId,
            requestId: 'ce756ea3402645c99dbdabeba2c426ec',
          }));
        })
        .expect(200);
    });

    it('can get balance', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        token: sessionId,
        requestId: '83b9843d915247bc92bf8c5fa7d6dd72',
      });
      return request(app)
        .post('/api/v1/synot/getBalance')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            realBalance: 10,
            bonusBalance: 0,
            requestId: '83b9843d915247bc92bf8c5fa7d6dd72',
          }));
        })
        .expect(200);
    });

    it('can fail if bet is too big', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10298,
        gameCode: 'EightyEightPearls',
        roundId: 5187,
        realAmount: 100,
        token: sessionId,
        requestId: '63841a9ce262489faf79cb8711d8ee3d',
      });
      return request(app)
        .post('/api/v1/synot/bet')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            code: 3001,
            message: 'Not enough money.',
          }));
        })
        .expect(500);
    });

    it('can post bet', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10298,
        gameCode: 'EightyEightPearls',
        roundId: 5187,
        realAmount: 0.2,
        token: sessionId,
        requestId: '63841a9ce262489faf79cb8711d8ee3d',
      });
      return request(app)
        .post('/api/v1/synot/bet')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            reference: res.body.reference,
            realAmount: 0.2,
            bonusAmount: 0,
            realBalance: 9.80,
            bonusBalance: 0,
            requestId: '63841a9ce262489faf79cb8711d8ee3d',
          }));
        })
        .expect(200);
    });

    it('can post win', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10299,
        gameCode: 'EightyEightPearls',
        roundId: 5187,
        realAmount: 2.3,
        isFinal: true,
        token: sessionId,
        requestId: '8c06e75c400c4a9fb8e0b4b1f792fc50',
      });
      return request(app)
        .post('/api/v1/synot/win')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            reference: res.body.reference,
            realAmount: 2.3,
            bonusAmount: 0,
            realBalance: 12.10,
            bonusBalance: 0,
            requestId: '8c06e75c400c4a9fb8e0b4b1f792fc50',
          }));
        })
        .expect(200);
    });

    it('can fail win with wrong game round id', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10299,
        gameCode: 'EightyEightPearls',
        roundId: 9999999,
        realAmount: 2.3,
        isFinal: true,
        token: sessionId,
        requestId: '8c06e75c400c4a9fb8e0b4b1f792fc50',
      });
      return request(app)
        .post('/api/v1/synot/win')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            code: 3002,
            message: 'Invalid game round ID.',
          }));
        })
        .expect(500);
    });

    it('can post another bet', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10300,
        gameCode: 'EightyEightPearls',
        roundId: 5187,
        realAmount: 0.5,
        token: sessionId,
        requestId: '63841a9ce262489faf79cb8711d8ee3d',
      });
      return request(app)
        .post('/api/v1/synot/bet')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            reference: res.body.reference,
            realAmount: 0.5,
            bonusAmount: 0,
            realBalance: 11.60,
            bonusBalance: 0,
            requestId: '63841a9ce262489faf79cb8711d8ee3d',
          }));
        })
        .expect(200);
    });

    it('can post rollback bet', () => {
      const body = signBody({
        playerId: getExternalPlayerId(player),
        transactionId: 10301,
        originalTransactionId: 10300,
        realAmount: 0.5,
        bonusAmount: 0,
        token: sessionId,
        requestId: '8032acedf7b44ac2934b039b47d33425',
      });
      return request(app)
        .post('/api/v1/synot/rollback')
        .send(body)
        .expect((res) => {
          expect(res.body).to.deep.equal(signBody({
            reference: res.body.reference,
            realAmount: 0.5,
            bonusAmount: 0,
            realBalance: 12.10,
            bonusBalance: 0,
            requestId: '8032acedf7b44ac2934b039b47d33425',
          }));
        })
        .expect(200);
    });
  });
});
