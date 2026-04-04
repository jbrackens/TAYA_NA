/* @flow */
const request = require('supertest');
const app = require('../../wallet-server');

describe('Players wallet routes', () => {
  let playerId;
  let username;
  before(async () => {
    const { john } = await setup.players();
    playerId = john.id;
    username = john.username;
  });

  it('returns player details for playerId', async () =>
    request(app)
      .get(`/api/v1/wallet/player/${playerId}`)
      .expect(200)
      .expect(res => expect(res.body).to.containSubset({
        currencyId: 'EUR',
      })));

  it('returns player balance for playerId', async () =>
    request(app)
      .get(`/api/v1/wallet/player/${playerId}/balance`)
      .expect(200)
      .expect(res => expect(res.body).to.containSubset({
        balance: 0,
        currencyId: 'EUR',
      })));

  it('fetches player by username', async () =>
    request(app)
      .get(`/api/v1/wallet/player/id/LD/${username}`)
      .expect(200)
      .expect(res => expect(res.body).to.containSubset({
        brandId: 'LD',
        currencyId: 'EUR',
      })));
});
