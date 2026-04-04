// @flow
const request = require('supertest');
const app = require('../../index');

describe('Segments', () => {
  it('creates player\'s lock', async () => {
    const { john } = await setup.players();

    await request(app)
      .get(`/api/v1/player/${john.id}/segments`)
      .expect(200)
      .expect((res) => {
        expect(res.body).to.deep.equal([]);
      });
  });
});
