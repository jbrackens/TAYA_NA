/* @flow */
const request = require('supertest');  

const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../index');
const config = require('../../../config');

describe('BF Games Wallet API', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;

    before(async () => request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'BFG',
        initialBalance: 1000,
      })
      .expect((res) => {
        sessionId = res.body.sessionId;
        playerId = getExternalPlayerId(res.body.player);
      })
      .expect(200));

    it('can post authenticateToken', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            token: sessionId,
          },
          methodname: 'authenticateToken',
          mirror: {
            id: 1544602837017426,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'authenticateToken',
            reflection: {
              id: 1544602837017426,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              currency: 'EUR',
              token: sessionId,
              player_id: playerId,
              balance: 1000,
              nickname: 'Jack S',
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can fail with wrong password', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: '123465',
            token: sessionId,
          },
          methodname: 'authenticateToken',
          mirror: {
            id: 1544602837017426,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'authenticateToken',
            reflection: {
              id: 1544602837017426,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: 2000,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can fail with wrong session', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            token: 'wrong session',
          },
          methodname: 'authenticateToken',
          mirror: {
            id: 1544602837017426,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'authenticateToken',
            reflection: {
              id: 1544602837017426,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: 2001,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post tokenRefresh', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            token: sessionId,
          },
          methodname: 'tokenRefresh',
          mirror: {
            id: 1544602837017426,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'tokenRefresh',
            reflection: {
              id: 1544602837017426,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              token: sessionId,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post getBalance', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            token: sessionId,
          },
          methodname: 'getBalance',
          mirror: {
            id: 1544602837017426,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'getBalance',
            reflection: {
              id: 1544602837017426,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              currency: 'EUR',
              balance: 1000,
              token: sessionId,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post withdraw', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            action_id: 'e234c4c1-7142-4506-ed78-e16417d11dad_0_2',
            amount: 20,
            currency: 'EUR',
            game_ref: 'BFGcrystal-mania',
            jackpot_contributions: [{
              jackpot_id: 'mysteryjackpot-bronze',
              contribution_amount: 10,
            }, {
              jackpot_id: 'mysteryjackpot-silver',
              contribution_amount: 20,
            }],
            round_id: 'BFG3b36432e-1b06-4d0a-8ebd-3a360fd51394:649',
            token: sessionId,
          },
          methodname: 'withdraw',
          mirror: {
            id: 1544602574783082,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'withdraw',
            reflection: {
              id: 1544602574783082,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              currency: 'EUR',
              token: sessionId,
              balance: 980,
              transaction_id: res.body.result.transaction_id,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post rollback', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            action_id: 'a72c736d-a254-46c6-ac87-facb37fab581',
            round_id: 'BFG3b36432e-1b06-4d0a-8ebd-3a360fd51394:649',
            rollback_action_id: 'e234c4c1-7142-4506-ed78-e16417d11dad_0_2',
            token: sessionId,
          },
          methodname: 'rollback',
          mirror: {
            id: 1544602574783082,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.deep.equal({
            methodname: 'rollback',
            reflection: {
              id: 1544602574783082,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              balance: 1000,
              currency: 'EUR',
              transaction_id: res.body.result.transaction_id,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post withdraw again', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            action_id: 'e234c4c1-7142-4506-ed78-e16417d11dad_0_6',
            amount: 20,
            currency: 'EUR',
            game_ref: 'BFGcrystal-mania',
            jackpot_contributions: [{
              jackpot_id: 'mysteryjackpot-bronze',
              contribution_amount: 10,
            }, {
              jackpot_id: 'mysteryjackpot-silver',
              contribution_amount: 20,
            }],
            round_id: 'BFG3b36432e-1b06-4d0a-8ebd-3a360fd51394:6853',
            token: sessionId,
          },
          methodname: 'withdraw',
          mirror: {
            id: 1544602574783082,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'withdraw',
            reflection: {
              id: 1544602574783082,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              currency: 'EUR',
              token: sessionId,
              balance: 980,
              transaction_id: res.body.result.transaction_id,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));

    it('can post deposit', () =>
      request(app)
        .post('/api/v1/bfgames')
        .send({
          args: {
            caller_id: 'bfgames',
            caller_password: 'yncjsh4D7bGMtE4B',
            action_id: 'd529c4c1-7142-4506-ed78-e16417d11dad_0_1',
            amount: 50,
            currency: 'EUR',
            game_ref: 'BFGcrystal-mania',
            jackpot_winnings: [{
              jackpot_id: 'mysteryjackpot-bronze',
              winnings_amount: 5003450,
            }],
            offline: false,
            round_id: 'BFG3b36432e-1b06-4d0a-8ebd-3a360fd51394:6853',
            token: sessionId,
          },
          methodname: 'deposit',
          mirror: {
            id: 1544602574783082,
          },
          type: 'jsonwsp/request',
          version: '1.0',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            methodname: 'deposit',
            reflection: {
              id: 1544602574783082,
            },
            servicenumber: 1,
            servicename: 'BFGamesSeamless',
            result: {
              errorcode: null,
              currency: 'EUR',
              token: sessionId,
              balance: 1030,
              transaction_id: res.body.result.transaction_id,
            },
            type: 'jsonwsp/response',
            version: '1.0',
          });
        })
        .expect(200));
  });
});
