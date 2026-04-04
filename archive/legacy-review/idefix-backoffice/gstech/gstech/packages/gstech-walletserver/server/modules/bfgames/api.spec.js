/* @flow */
const request = require('supertest');  
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../api-server');
const config = require('../../../config');


const nock = require('nock'); // eslint-disable-line

// nock.recorder.rec();
describe('BF Games API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'BFG',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    nock(config.api.backend.walletUrl, { allowUnmocked: true })
      .post('/session/BFG/game')
      .reply(200);

    nock('https://gs-giantgaming-int.beefee.co.uk:443', { encodedQueryParams: true })
      .post('/gamehub/giantgaming/game/start')
      .reply(200);

    nock('https://gs-giantgaming-int.beefee.co.uk:443', { encodedQueryParams: true })
      .post('/gamehub/giantgaming/bonus', { playerId: getExternalPlayerId(player), bonusInstanceId: 'abcd456789', bonusProgram: '33c3ef20-5878-11ea-af8a-7174c76ac0d0', currency: 'EUR', games: ['BFGcrystal-mania'], roundsCount: '10' })
      .reply(200, { playerId: getExternalPlayerId(player), providerBonusInstanceId: 'BFGGTGabcd456789' });
  });

  it('can credit free spins', () =>
    request(app)
      .post('/api/v1/LD/creditfreespins/BFG')
      .send({
        player,
        sessionId: 12,
        bonusCode: '33c3ef20-5878-11ea-af8a-7174c76ac0d0:BFGcrystal-mania:10',
        id: 'abcd456789',
        client: {
          ipAddress: '127.0.0.1',
          userAgent: 'chrome',
          isMobile: false,
        },
      })
      .expect((res) => {
        expect(res.body).to.containSubset({
          ok: true,
        });
      })
      .expect(200));
});
