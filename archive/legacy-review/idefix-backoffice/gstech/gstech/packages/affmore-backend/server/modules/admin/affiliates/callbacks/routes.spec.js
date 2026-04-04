/* @flow */
const { DateTime } = require('luxon');
const request = require('supertest');  
const app = require('../../../../app');

describe('Callbacks Routes', () => {
  let token = '';
  let callbackId;
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

  it('can get callbacks', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/callbacks')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          callbacks: [{
            callbackId: 1,
            linkId: null,
            brandId: 'LD',
            method: 'POST',
            trigger: 'NRC',
            url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
            enabled: true,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
          }, {
            callbackId: 2,
            linkId: null,
            brandId: 'LD',
            method: 'POST',
            trigger: 'NDC',
            url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
            enabled: true,
            createdBy: 0,
            createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
            updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30).toISO(),
          }],
        });
      })
      .expect(200);
  });

  it('can create callback', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/7676767/callbacks')
      .set('x-auth-token', token)
      .send({
        callback: {
          linkId: null,
          brandId: 'LD',
          method: 'POST',
          trigger: 'NRC',
          url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
          enabled: true,
        },
      })
      .expect((res) => {
        callbackId = res.body.data.callback.callbackId;
        expect(res.body.data).to.deep.equal({
          callback: {
            callbackId,
            linkId: null,
            brandId: 'LD',
            method: 'POST',
            trigger: 'NRC',
            url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
            enabled: true,
            createdBy: 0,
            createdAt: res.body.data.callback.createdAt,
            updatedAt: res.body.data.callback.updatedAt,
          },
        });
      })
      .expect(200);
  });

  it('can fail create callback with existing data', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/7676767/callbacks')
      .set('x-auth-token', token)
      .send({
        callback: {
          linkId: null,
          brandId: 'LD',
          method: 'POST',
          trigger: 'NRC',
          url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
          enabled: true,
        },
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Callback with this data already exists',
        });
      })
      .expect(409);
  });


  it('can fail update callback with existing data', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/7676767/callbacks/1')
      .set('x-auth-token', token)
      .send({
        callback: {
          linkId: null,
          brandId: 'LD',
          method: 'POST',
          trigger: 'NRC',
          url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
          enabled: true,
        },
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Callback with this data already exists',
        });
      })
      .expect(409);
  });

  it('can update callback', async () => {
    await request(app)
      .put(`/api/v1/admin/affiliates/7676767/callbacks/${callbackId}`)
      .set('x-auth-token', token)
      .send({
        callback: {
          linkId: null,
          brandId: 'LD',
          method: 'POST',
          trigger: 'NRC',
          url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
          enabled: true,
        },
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          callback: {
            callbackId,
            linkId: null,
            brandId: 'LD',
            method: 'POST',
            trigger: 'NRC',
            url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
            enabled: true,
            createdBy: 0,
            createdAt: res.body.data.callback.createdAt,
            updatedAt: res.body.data.callback.updatedAt,
          },
        });
      })
      .expect(200);
  });


  it('can delete callback', async () => {
    await request(app)
      .delete(`/api/v1/admin/affiliates/7676767/callbacks/${callbackId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can fail update callback if not found', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/7676767/callbacks/9999999')
      .set('x-auth-token', token)
      .send({
        callback: {
          linkId: null,
          brandId: 'LD',
          method: 'POST',
          trigger: 'NRC',
          url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
          enabled: true,
        },
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Callback not found',
          },
        });
      })
      .expect(404);
  });

  it('can fail delete callback non existing callback', async () => {
    await request(app)
      .delete('/api/v1/admin/affiliates/7676767/callbacks/666')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Callback not found',
        });
      })
      .expect(404);
  });
});
