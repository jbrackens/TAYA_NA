/* @flow */
const request = require('supertest');  
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../api-server');
const config = require('../../../config');


const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();


describe.skip('Evolution API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'EVO',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

    nock('https://luckydino.uat1.evo-test.com:443', { encodedQueryParams: true })
      .post('/api/free-games/v1/campaigns/8f95530a-2ec4-41a8-bfd2-bfb3c7c72822/vouchers/issue-one', { playerId: getExternalPlayerId(player), currency: 'EUR', winningSettings: { initialBalance: '100', maxWinnings: '100' } })
      .reply(200, { pk: { voucherId: '8554d123-7376-4c3f-b3d6-14995fe988a0', playerId: { externalId: getExternalPlayerId(player), casinoId: 'luckydino0000001' } }, winningSettings: { initialBalance: 100, maxWinnings: 100 }, currency: 'EUR', balances: { playable: 100, winnings: 0 }, lifetime: { issuedAt: '2020-05-13T14:24:37.211677Z', expirationDuration: 'PT240H' }, state: 'Active' });
  });

  it('can credit free spins', () =>
    request(app)
      .post('/api/v1/LD/creditfreespins/EVO')
      .send({
        player,
        bonusCode: '8f95530a-2ec4-41a8-bfd2-bfb3c7c72822:100:100',
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
