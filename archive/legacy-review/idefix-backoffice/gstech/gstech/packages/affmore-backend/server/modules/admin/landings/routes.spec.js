/* @flow */
const request = require('supertest');  
const { DateTime } = require('luxon');

const app = require('../../../app');

describe('Landings Routes', () => {
  let landingId;
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

  it('can create landing', async () => {
    await request(app)
      .post('/api/v1/admin/landings')
      .set('x-auth-token', token)
      .send({
        brandId: 'LD',
        landingPage: 'http://page4.com',
      })
      .expect((res) => {
        landingId = res.body.data.landing.landingId;
        expect(res.body.data).to.deep.equal({
          landing: {
            landingId,
            brandId: 'LD',
            landingPage: 'http://page4.com',

            createdBy: 0,
            createdAt: res.body.data.landing.createdAt,
            updatedAt: res.body.data.landing.updatedAt,
          },
        });
      })
      .expect(200);
  });

  it('can update landing', async () => {
    await request(app)
      .put(`/api/v1/admin/landings/${landingId}`)
      .set('x-auth-token', token)
      .send({
        brandId: 'LD',
        landingPage: 'http://page5.com',
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          landing: {
            landingId,
            brandId: 'LD',
            landingPage: 'http://page5.com',

            createdBy: 0,
            createdAt: res.body.data.landing.createdAt,
            updatedAt: res.body.data.landing.updatedAt,
          },
        });
      })
      .expect(200);
  });

  it('can delete landing', async () => {
    await request(app)
      .delete(`/api/v1/admin/landings/${landingId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can get landings', async () => {
    await request(app)
      .get('/api/v1/admin/landings')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          landings: [{
            landingId: 1,
            brandId: 'CJ',
            landingPage: 'https://beta.casinojefe.com/en',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 2,
            brandId: 'KK',
            landingPage: 'https://beta.kalevalakasino.com/en',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 3,
            brandId: 'LD',
            landingPage: 'https://beta.luckydino.com/en',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 612,
          }, {
            landingId: 4,
            brandId: 'OS',
            landingPage: 'https://beta.olaspill.com/en',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 5,
            brandId: 'CJ',
            landingPage: 'https://beta.casinojefe.com/custom',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 6,
            brandId: 'KK',
            landingPage: 'https://beta.kalevalakasino.com/custom',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 7,
            brandId: 'LD',
            landingPage: 'https://beta.luckydino.com/custom',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }, {
            landingId: 8,
            brandId: 'OS',
            landingPage: 'https://beta.olaspill.com/custom',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }],
        });
      })
      .expect(200);
  });

  it('can get brand landings', async () => {
    await request(app)
      .get('/api/v1/admin/landings/KK')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          landings: [{
            landingId: 2,
            brandId: 'KK',
            landingPage: 'https://beta.kalevalakasino.com/en',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            usages: 0,
          }, {
            landingId: 6,
            brandId: 'KK',
            landingPage: 'https://beta.kalevalakasino.com/custom',

            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),

            usages: 0,
          }],
        });
      })
      .expect(200);
  });

  it('fail update landing with unknown id', async () => {
    await request(app)
      .put('/api/v1/admin/landings/66666')
      .set('x-auth-token', token)
      .send({
        brandId: 'LD',
        landingPage: 'http://page5.com',
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Landing not found',
          },
        });
      })
      .expect(404);
  });
});
