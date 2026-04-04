/* @flow */
const request = require('supertest');
const app = require('../../index');

const { players: { john } } = require('../../../scripts/utils/db-data');

describe('Promotion routes', () => {
  let headers;
  before(async () => {
    await setup.players();
    headers = await setup.login(app, john.email, john.password);
  });


  it('returns active counters of player', () =>
    request(app)
      .get('/api/LD/v1/promotions')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({ result: [
          {
            promotion: 'LD_REWARDS',
            complete: false,
          },
        ],
        });
      }));

  it('can activate a promotion', () =>
    request(app)
      .post('/api/LD/v1/promotions/LD_TEST')
      .set(headers)
      .expect(200));

  it('can get a promotion leaderboard', () =>
    request(app)
      .get('/api/LD/v1/promotions/LD_GAME_PROMOTION?brands=LD&brands=OS&brands=KK')
      .set(headers)
      .expect(res => {
        expect(res.body).to.deep.equal({
          result: [],
        })
      })
      .expect(200));

  it('returns active counters of player with activated promotion', () =>
    request(app)
      .get('/api/LD/v1/promotions')
      .set(headers)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.containSubset({ result: [
          {
            promotion: 'LD_REWARDS',
          },
          {
            promotion: 'LD_TEST',
          },
        ],
        });
      }));
});
