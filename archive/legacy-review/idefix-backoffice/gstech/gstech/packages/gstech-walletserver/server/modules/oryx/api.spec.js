/* @flow */
const request = require('supertest');  
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../api-server');
const config = require('../../../config');


const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe('Oryx API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'ORX',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    nock('https://api-prodcopy.oryxgaming.com:443', { encodedQueryParams: true })
      .post('/bos/agg/wallets/LUCKYDINODE/fr/v1/template/award', {
        playerId: getExternalPlayerId(player),
        freeRoundCode: 'promotest1',
        externalId: 'abcd1234',
        currencyCode: 'EUR',
      }).reply(204);
  });

  it('can credit free spins', () =>
    request(app)
      .post('/api/v1/LD/creditfreespins/ORX')
      .send({
        player,
        bonusCode: 'promotest1',
        id: 'abcd1234',
        sessionId: 123,
        games: [],
      })
      .expect((res) => {
        expect(res.body).to.containSubset({
          ok: true,
        });
      })
      .expect(200));
});
