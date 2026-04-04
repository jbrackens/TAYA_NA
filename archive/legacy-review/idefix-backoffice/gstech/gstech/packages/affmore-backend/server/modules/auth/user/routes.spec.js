/* @flow */
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');
const app = require('../../../app');

const repository = require('./repository');

describe('Users Auth Routes', () => {
  let token;
  let adminToken;
  const timeStamp = new Date().getTime();
  before(async () => {
    const initUser = () => {
      const testUser = {
        source: {
          email: `johnny${timeStamp}@bravo.com`,
          password: '$2b$10$QJkpUO/7bVQiUwZOaIIPouTuaPBpkXIimcY6i7jpPfIEYX9nUir9C',
        },
        result: {
          email: `johnny${timeStamp}@bravo.com`,
          password: '$2b$10$QJkpUO/7bVQiUwZOaIIPouTuaPBpkXIimcY6i7jpPfIEYX9nUir9C',
          roles: ['affiliate'],
        },
      };

      return testUser;
    };
    const { source } = initUser();
    await repository.createUser(pg, source, 'admin');

    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'admin@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        adminToken = res.header['x-auth-token'];
      });

    await request(app)
      .post('/api/v1/auth/affiliate/register')
      .send({
        email: `johnny${timeStamp}@bravo.com`,
        password: '123456789',

        paymentMethod: 'skrill',
        paymentMethodDetails: { },

        name: 'Bravo Company',
        contactName: 'Johnny Bravo',
        countryId: 'EE',
        address: 'Robinsoni 30',
        phone: '+372 56468932',
        skype: 'johnny.bravo',
        vatNumber: '123456789',
        info: 'test info',
        allowEmails: true,
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: res.body.data.affiliateId,
          },
        });
        token = res.header['x-auth-token'];
        expect(res.header['x-auth-token']).to.exist();
      })
      .expect(200);
  });

  it('can call login', async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: `johnny${timeStamp}@bravo.com`,
        password: '123456789',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            email: `johnny${timeStamp}@bravo.com`,
            roles: ['admin'],
          },
        });
        expect(res.header['x-auth-token']).to.exist();
      })
      .expect(200);
  });

  it('can fail login with wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'johnny@bravo.com',
        password: 'wrong_pass',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'User email and/or password is incorrect',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);
  });

  it('can fail login with wrong data', async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email2: 'johnny@bravo.com',
        password: '123456789',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: '{\n  "email": "Email is required"\n}',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(400);
  });

  it('can fail login with wrong user', async () => {
    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'jackie@bravo.com',
        password: '123456789',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'User email and/or password is incorrect',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);
  });

  it('can fail auth with affiliate token', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can fail auth without token', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can fail auth with wrong token', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates')
      .set('x-auth-token', 'WRONG_TOKEN')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });
  
  it('can call user profile', async () => {
    await request(app)
      .get('/api/v1/admin/profile')
      .set('x-auth-token', adminToken)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            userId: 0,
            email: 'admin@luckydino.com',
            roles: ['admin'],
          },
        });
      })
      .expect(200);
  });
});
