/* @flow */
const request = require('supertest');
const app = require('../../index');

describe('users', () => {
  describe('without active session', () => {
    it('returns 403 when session is not active', async () =>
      request(app)
        .get('/api/v1/settings')
        .set({ 'X-Authentication': true })
        .expect(403));
  });
  describe('with active session', () => {
    let headers;

    before(async () => {
      await request(app)
        .post('/api/v1/login')
        .send({ email: 'test@luckydino.com', password: 'foobar123' })
        .expect(200)
        .expect((res) => {
          headers = { 'X-Authentication': true, Authorization: `Token ${res.body.token}` };
        });
    });

    it('returns data', async () =>
      request(app)
        .get('/api/v1/settings')
        .set(headers)
        .expect(200)
        .expect((res) => {
          expect(res.body.brands).to.not.equal(null);
        }));
  });
});
