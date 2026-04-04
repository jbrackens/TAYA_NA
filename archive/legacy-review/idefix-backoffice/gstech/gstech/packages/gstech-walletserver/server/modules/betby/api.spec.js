/* @flow */
const request = require('supertest');  
const { getExternalPlayerId } = require('gstech-core/modules/helpers');
const app = require('../../api-server');
const config = require('../../../config');

const nock = require('nock'); // eslint-disable-line
// nock.recorder.rec();

describe.skip('Betby API', () => {
  let player;
  before(async () => {
    await request(config.api.backend.url)
      .post('/api/v1/test/init-session')
      .send({
        manufacturer: 'BBY',
        initialBalance: 1000,
      })
      .expect((res) => {
        player = res.body.player;
      })
      .expect(200);

      nock('https://external-api.invisiblesport.com:443', { encodedQueryParams: true })
        .post('/api/v1/external_api/bonus/mass_give_bonus', () => true)
        .reply(200, {
          result: {
            items: [
              {
                id: '2069465164343812096',
                template_id: '2067685266524610560',
                name: 'Test Freebet',
                type: 'freebet',
                player_id: null,
                external_player_id: getExternalPlayerId(player),
                brand_id: '2049202926706106368',
                event_scheduled: null,
                receipt_date: 1636373158,
                issue_type: 'api',
                restrictions: null,
                viewed: false,
                activation_date: null,
                ending_date: null,
                status: 'new',
                from_time: 1635873178,
                to_time: 1636650788,
                freebet_data: {
                  amount: 1000,
                  currency: 'EUR',
                  exchange_rate: '1',
                  type: 'snr',
                  min_selection: 1,
                  max_selection: 1,
                  min_odd: 1,
                  max_odd: 222,
                  bonus_refund: false,
                },
                bet_restrictions: { type: 'all', bets_data: [] },
              },
            ],
          },
        });
      });

  it('can credit free spins', () =>
    request(app)
      .post('/api/v1/VB/creditfreespins/BBY')
      .send({
        player: { ...player, brandId: 'VB' },
        bonusCode: '2067685266524610560:10',
        id: '2067685266524610560',
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
