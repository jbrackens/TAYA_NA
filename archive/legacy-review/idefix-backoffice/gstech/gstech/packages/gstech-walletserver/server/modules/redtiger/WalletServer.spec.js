/* @flow */
const request = require('supertest');  
const app = require('../../index');
const config = require('../../../config');

const configuration = config.providers.redtiger;

describe('Red Tiger WalletServer', () => {
  describe('with active session', () => {
    let sessionId;
    let playerId;
    before(() => request(app)
      .post('/api/v1/redtiger/session')
      .set('Authorization', `Basic ${configuration.apiKey}`)
      .send({})
      .expect((res) => {
        sessionId = res.body.result.token;
        playerId = res.body.result.userId;
      })
      .expect(200));

    it('can fail authorization', () =>
      request(app)
        .post('/api/v1/redtiger/auth')
        .send({
          token: sessionId,
          casino: 'casino1',
          userId: null,
          currency: null,
          channel: 'I',
          affiliate: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'API authentication error',
              code: 100,
            },
          });
        })
        .expect(500));

    it('can fail session', () =>
      request(app)
        .post('/api/v1/redtiger/auth')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: 'WRONG_SESSION',
          casino: 'casino1',
          userId: null,
          currency: null,
          channel: 'I',
          affiliate: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Not authorized',
              code: 301,
            },
          });
        })
        .expect(500));

    it('can fail contract', () =>
      request(app)
        .post('/api/v1/redtiger/auth')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          casino: 'casino1',
          userId: null,
          currency: null,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Invalid Input',
              code: 200,
            },
          });
        })
        .expect(500));

    it('can post auth', () =>
      request(app)
        .post('/api/v1/redtiger/auth')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          casino: 'casino1',
          userId: null,
          currency: null,
          channel: 'I',
          affiliate: '',
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              userId: String(playerId),
              currency: 'EUR',
              country: 'DE',
              language: 'en',
              casino: 'casino1',
              balance: {
                cash: '1000.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail playerid format', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: `LD_${String(playerId)}`,
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Not authorized',
              code: 301,
            },
          });
        })
        .expect(500));

    it('can fail player is NaN', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: 'LD_fdfsfs',
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Not authorized',
              code: 301,
            },
          });
        })
        .expect(500));

    it('can fail gameid', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'WRONG_GAMEID',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Invalid Input',
              code: 200,
            },
          });
        })
        .expect(500));

    it('can fail player', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: 'LD_66',
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 302,
              message: 'User not found',
            },
          });
        })
        .expect(500));

    it('can fail stake with wrong currency', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'USD',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 305,
              message: 'Invalid user currency',
            },
          });
        })
        .expect(500));

    it('can post stake', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              currency: 'EUR',
              stake: {
                cash: '2.00',
                bonus: '0.00',
              },
              balance: {
                cash: '998.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail stake with same id', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-509',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 401,
              message: 'Duplicated transaction',
            },
          });
        })
        .expect(500));

    it('can post payout', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-510',
            payout: '2.00',
            payoutPromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              payout: {
                cash: '2.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1000.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail payout with same id', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-510',
            payout: '2.00',
            payoutPromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 401,
              message: 'Duplicated transaction',
            },
          });
        })
        .expect(500));

    it('can post another payout', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-544',
            payout: '4.00',
            payoutPromo: '0.00',
            details: {
              game: '4.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: true,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              payout: {
                cash: '4.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1004.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can post payout with recon token', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: configuration.reconToken,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-351-547',
            payout: '1.00',
            payoutPromo: '0.00',
            details: {
              game: '1.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: true,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: configuration.reconToken,
              payout: {
                cash: '1.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail payout with invalid token', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: 'INVALID TOKEN',
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-301-544',
            payout: '4.00',
            payoutPromo: '0.00',
            details: {
              game: '4.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: true,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 301,
              message: 'Not authorized',
            },
          });
        })
        .expect(500));

    it('can fail payout with wrong currency', () =>
      request(app)
        .post('/api/v1/redtiger/payout')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'USD',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-311-544',
            payout: '4.00',
            payoutPromo: '0.00',
            details: {
              game: '4.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: true,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 305,
              message: 'Invalid user currency',
            },
          });
        })
        .expect(500));

    it('can post stake to refund later', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-317-546',
            stake: '3.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              currency: 'EUR',
              stake: {
                cash: '3.00',
                bonus: '0.00',
              },
              balance: {
                cash: '1002.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail refund with wrong currency', () =>
      request(app)
        .post('/api/v1/redtiger/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'USD',
          ip: '1333528002',
          transaction: {
            id: 'pref4-317-546',
            stake: '3.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 305,
              message: 'Invalid user currency',
            },
          });
        })
        .expect(500));

    it('can post refund', () =>
      request(app)
        .post('/api/v1/redtiger/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '1333528002',
          transaction: {
            id: 'pref4-317-546',
            stake: '3.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              stake: {
                cash: '3.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail refunding not existing', () =>
      request(app)
        .post('/api/v1/redtiger/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '1333528002',
          transaction: {
            id: 'pref4-317-546888',
            stake: '3.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 400,
              message: 'Transaction not found',
            },
          });
        })
        .expect(500));

    it('can post 0 stake', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-317-540',
            stake: '0.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              currency: 'EUR',
              stake: {
                cash: '0.00',
                bonus: '0.00',
              },
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can post overbet', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-317-770',
            stake: '1500.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '317',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              message: 'Insufficient funds',
              code: 304,
            },
          });
        })
        .expect(500));


    it('can post new stake', () =>
      request(app)
        .post('/api/v1/redtiger/stake')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-333-533',
            stake: '10.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '318',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              currency: 'EUR',
              stake: {
                cash: '10.00',
                bonus: '0.00',
              },
              balance: {
                cash: '995.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can refund with recon token', () =>
      request(app)
        .post('/api/v1/redtiger/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: configuration.reconToken,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '1333528002',
          transaction: {
            id: 'pref4-333-533',
            stake: '10.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '318',
            starts: true,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: configuration.reconToken,
              currency: 'EUR',
              stake: {
                cash: '10.00',
                bonus: '0.00',
              },
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can fail refund with same id with recon token', () =>
      request(app)
        .post('/api/v1/redtiger/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: configuration.reconToken,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '1333528002',
          transaction: {
            id: 'pref4-333-533',
            stake: '10.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '318',
            starts: true,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: false,
            error: {
              code: 401,
              message: 'Duplicated transaction',
            },
          });
        })
        .expect(500));

    it('can post promo buyin', () =>
      request(app)
        .post('/api/v1/redtiger/promo/buyin')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-333-500',
            stake: '10.00',
            stakePromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '318',
            starts: true,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              currency: 'EUR',
              stake: {
                cash: '10.00',
                bonus: '0.00',
              },
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can post promo settle', () =>
      request(app)
        .post('/api/v1/redtiger/promo/settle')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '192.168.100.102',
          transaction: {
            id: 'pref4-351-598',
            payout: '2.00',
            payoutPromo: '0.00',
            details: {
              game: '0.00',
              jackpot: '0.00',
            },
            sources: {
              lines: '0.00',
              features: '0.00',
              jackpot: {
                'DRAGON JACKPOT': '0.000000',
                'INSTANT CASHPOT': '0.000000',
                PROGRESSIVE: '0.000000',
              },
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: false,
          },
          promo: {
            type: 'bonus',
            instanceCode: '',
            instanceId: 224,
            campaignCode: 'BONUS09',
            campaignId: 0,
          },
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
          jackpot: {
            group: 'betfairMacau',
            contribution: '2.00',
            pots: [
              'DRAGON JACKPOT',
              'INSTANT CASHPOT',
              'PROGRESSIVE',
            ],
          },
          retry: false,
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              payout: {
                cash: '2.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1007.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));

    it('can post promo refund', () =>
      request(app)
        .post('/api/v1/redtiger/promo/refund')
        .set('Authorization', `Basic ${configuration.apiKey}`)
        .send({
          token: sessionId,
          userId: String(playerId),
          casino: 'casino1',
          currency: 'EUR',
          ip: '1333528002',
          transaction: {
            id: 'pref4-351-598',
            stake: '2.00',
            stakePromo: '0.00',
            details: {
              game: '2.00',
              jackpot: '0.040000',
            },
          },
          round: {
            id: '301',
            starts: false,
            ends: false,
          },
          promo: null,
          game: {
            type: 'slot',
            key: 'DragonsLuck',
            version: 'DragonsLuck_r3_rtp91_jp',
          },
        })
        .expect((res) => {
          expect(res.body).to.containSubset({
            success: true,
            result: {
              token: sessionId,
              stake: {
                cash: '2.00',
                bonus: '0.00',
              },
              currency: 'EUR',
              balance: {
                cash: '1005.00',
                bonus: '0.00',
              },
            },
          });
        })
        .expect(200));
  });
});
