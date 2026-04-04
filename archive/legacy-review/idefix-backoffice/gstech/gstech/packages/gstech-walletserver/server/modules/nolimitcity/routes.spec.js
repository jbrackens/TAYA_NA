/* @flow */
const request = require('supertest');  
const { v1: uuid } = require('uuid');

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');

describe('Nolimit City Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let userId;
    const transactionId = uuid();

    before(async () =>
      request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'NC',
          initialBalance: 1000,
        })
        .expect((res) => {
          sessionId = res.body.sessionId;
          userId = getExternalPlayerId(res.body.player);
        })
        .expect(200),
    );

    it('can post validate token', () =>
      request(app)
        .post(`/api/v1/nolimitcity`)
        .send({
          jsonrpc: '2.0',
          method: 'wallet.validate-token',
          params: {
            identification: {
              name: 'LUCKYDINO',
              key: 'ey3Shoh3ie',
            },
            token: sessionId,
            game: 'TheCreepyCarnival',
          },
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            jsonrpc: '2.0',
            result: {
              userId,
              username: 'Jack S',
              balance: {
                amount: '10.00',
                currency: 'EUR',
              },
            },
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          });
        })
        .expect(200));

    it('can post withdraw', () =>
      request(app)
        .post(`/api/v1/nolimitcity`)
        .send({
          jsonrpc: '2.0',
          method: 'wallet.withdraw',
          params: {
            identification: {
              name: 'LUCKYDINO',
              key: 'ey3Shoh3ie',
            },
            userId,
            withdraw: {
              amount: '2.00',
              currency: 'EUR',
            },
            information: {
              uniqueReference: uuid(),
              gameRoundId: 'round1',
              game: 'TheCreepyCarnival',
              time: '2016-01-02T12:34:56.789Z',
            },
          },
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            jsonrpc: '2.0',
            result: {
              balance: { amount: '8.00', currency: 'EUR' },
            },
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          });
        })
        .expect(200));

    it('can post deposit', () =>
      request(app)
        .post(`/api/v1/nolimitcity`)
        .send({
          jsonrpc: '2.0',
          method: 'wallet.deposit',
          params: {
            identification: {
              name: 'LUCKYDINO',
              key: 'ey3Shoh3ie',
            },
            userId,
            deposit: {
              amount: '10.00',
              currency: 'EUR',
            },
            information: {
              uniqueReference: uuid(),
              gameRoundId: 'round1',
              game: 'TheCreepyCarnival',
              time: '2016-01-02T12:34:56.789Z',
            },
          },
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            jsonrpc: '2.0',
            result: {
              balance: { amount: '18.00', currency: 'EUR' },
            },
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          });
        })
        .expect(200));

    it('can post another withdraw', () =>
      request(app)
        .post(`/api/v1/nolimitcity`)
        .send({
          jsonrpc: '2.0',
          method: 'wallet.withdraw',
          params: {
            identification: {
              name: 'LUCKYDINO',
              key: 'ey3Shoh3ie',
            },
            userId,
            withdraw: {
              amount: '5.00',
              currency: 'EUR',
            },
            information: {
              uniqueReference: transactionId,
              gameRoundId: 'round1',
              game: 'TheCreepyCarnival',
              time: '2016-01-02T12:34:56.789Z',
            },
          },
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            jsonrpc: '2.0',
            result: {
              balance: { amount: '13.00', currency: 'EUR' },
            },
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          });
        })
        .expect(200));

    it('can post rollback', () =>
      request(app)
        .post(`/api/v1/nolimitcity`)
        .send({
          jsonrpc: '2.0',
          method: 'wallet.rollback',
          params: {
            identification: {
              name: 'LUCKYDINO',
              key: 'ey3Shoh3ie',
            },
            userId,
            information: {
              uniqueReference: transactionId,
              gameRoundId: 'round1',
              game: 'TheCreepyCarnival',
              time: '2016-01-02T12:34:56.789Z',
            },
          },
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            jsonrpc: '2.0',
            result: {
              balance: { amount: '18.00', currency: 'EUR' },
            },
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          });
        })
        .expect(200));
  });
});
