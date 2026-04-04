// @flow
const request = require('supertest');
const { v1: uuid } = require('uuid');
const app = require('../../index');

describe('locks', () => {
  describe('PUT /locks/:playerId', () => {
    it('creates player\'s lock', async () => {
      const { john } = await setup.players();

      await request(app)
        .put(`/api/v1/locks/${john.id}`)
        .set('x-userId', 1)
        .set('x-sessionid', uuid())
        .expect(200);

      const { body: locks } = await request(app)
        .get('/api/v1/locks/')
        .set('x-userId', 2)
        .set('x-sessionid', uuid())
        .expect(200);

      expect(locks).to.eql({
        [john.id]: { id: 1, handle: 'Test' },
      });
    });
  });

  describe('DELETE /locks/:playerId', () => {
    it('removes player\'s lock', async () => {
      const { john } = await setup.players();
      const sessionId = uuid();

      await request(app)
        .put(`/api/v1/locks/${john.id}`)
        .set('x-userId', 1)
        .set('x-sessionid', sessionId)
        .expect(200);

      await request(app)
        .del(`/api/v1/locks/${john.id}`)
        .set('x-userId', 1)
        .set('x-sessionid', sessionId)
        .expect(200);

      const { body: locks } = await request(app)
        .get('/api/v1/locks/')
        .set('x-userId', 2)
        .set('x-sessionid', uuid())
        .expect(200);

      expect(locks).to.eql({});
    });
  });
});
