/* @flow */
const request = require('supertest');  

const app = require('../../../app');

describe('Users Routes', () => {
  let token = '';
  before(async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'admin@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      });
  });

  it('can get users', async () => {
    await request(app)
      .get('/api/v1/admin/users')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.users[0]).to.deep.equal({
          userId: 0,
          email: 'admin@luckydino.com',
          roles: ['admin'],
        });
      })
      .expect(200);
  });
});
