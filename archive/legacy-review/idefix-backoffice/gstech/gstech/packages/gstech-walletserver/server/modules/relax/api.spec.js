/* @flow */
const request = require('supertest');  
const app = require('../../api-server');
const config = require('../../../config');

// const configuration = config.providers.relax;

const nock = require('nock'); // eslint-disable-line

describe('Credit FreeSpins with Relax Partner API', () => {
  describe('with active player session and bad request - should failed', () => {
    let player;
    const sessionId = 123;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'RLX',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);
    });
    it('can fail credit free spins with empty Games list', async () =>
      await request(app)
        .post('/api/v1/LD/creditfreespins/RLX')
        .send({
          player,
          bonusCode: 'LD:relaxFS1:10:100',
          id: 'abcd1234',
          sessionId,
          games: [],
        })
        .expect(500)
        .expect((res) => {
          expect(res.body.error.message).to.contain('Empty Games list');
        }));

    it('can fail credit free spins with wrong bonusCode format', async () =>
      await request(app)
        .post('/api/v1/LD/creditfreespins/RLX')
        .send({
          player,
          bonusCode: 'relaxFS1',
          id: 'abcd1234',
          sessionId,
          games: [{ mobileGame: true, manufacturerGameId: 'blackjackneo' }],
        })
        .expect(500));

    it('can fail credit free spins when Game has no betAmounts', async () =>
      await request(app)
        .post('/api/v1/LD/creditfreespins/RLX')
        .send({
          player,
          bonusCode: 'LD:relaxFS1:10:100',
          id: 'abcd1234',
          sessionId,
          games: [{ mobileGame: true, manufacturerGameId: 'blackjackneo' }],
        })
        .expect(500)
        .expect((res) => {
          expect(res.body.error.message).to.contain('no betAmounts!');
        }));
  });

  describe.skip('Can assign FreeSpins with active player session and proper request', () => {
    let player;
    const sessionId = 123;
    before(async () => {
      await request(config.api.backend.url)
        .post('/api/v1/test/init-session')
        .send({
          manufacturer: 'RLX',
          initialBalance: 1000,
        })
        .expect((res) => {
          player = res.body.player;
        })
        .expect(200);

      nock('https://stag-casino-partner.api.relaxg.net:7000/papi/1.0', { encodedQueryParams: true })
        .post('/casino/freespins/add', () => true)
        .reply(200, {
          status: 'ok',
          txid: 'transaction1',
          freespinids: [['45465', 123456]],
        });
    });

    it('can credit free spins with Game and bonusCode', async () =>
      await request(app)
        .post('/api/v1/LD/creditfreespins/RLX')
        .send({
          player,
          bonusCode: 'LD:relaxFS1:10:100',
          id: 'abcd1234',
          sessionId,
          games: [{ mobileGame: true, manufacturerGameId: 'erikthered' }],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).to.containSubset({
            ok: true,
          });
        }));
  });
});
