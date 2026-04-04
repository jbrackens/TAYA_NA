/* @flow */
const { DateTime } = require('luxon');
const request = require('supertest');  

const app = require('../../../../app');

describe('Logs Routes', () => {
  let token = '';
  let attachment;

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

  it('can create affiliate log', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/100000/logs')
      .set('x-auth-token', token)
      .send({
        note: 'Some interesting note',
      })
      .expect((res) => {
        expect(res.body.data.log).to.deep.equal({
          logId: res.body.data.log.logId,
          note: 'Some interesting note',
          attachments: [],
          createdBy: 0,
          createdAt: res.body.data.log.createdAt,
          updatedAt: res.body.data.log.updatedAt,
        });
      })
      .expect(200);
  });

  it('can create affiliate log with attachment', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/100000/logs')
      .set('x-auth-token', token)
      .field('note', 'Some interesting note')
      .attach('file', Buffer.from('example file content'), { filename: 'example.txt', contentType: 'multipart/form-data' })
      .expect((res) => {
        expect(res.body.data.log).to.deep.equal({
          logId: res.body.data.log.logId,
          note: 'Some interesting note',
          attachments: res.body.data.log.attachments,
          createdBy: 0,
          createdAt: res.body.data.log.createdAt,
          updatedAt: res.body.data.log.updatedAt,
        });

        [attachment] = res.body.data.log.attachments;
        expect(attachment).to.contain('example.txt');
      })
      .expect(200);
  });

  it('can get affiliate logs', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/logs')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.logs.slice(Math.max(res.body.data.logs.length - 3, 1))).to.deep.equal([{
          logId: 3,
          note: 'One beautiful note',
          attachments: [],
          createdBy: 0,
          createdAt: DateTime.utc(2019, 10, 25, 18, 15, 30).toISO(),
          updatedAt: DateTime.utc(2019, 10, 25, 18, 15, 30).toISO(),
        }, {
          logId: 2,
          note: 'One beautiful note',
          attachments: [],
          createdBy: 0,
          createdAt: DateTime.utc(2019, 10, 15, 18, 15, 30).toISO(),
          updatedAt: DateTime.utc(2019, 10, 15, 18, 15, 30).toISO(),
        }, {
          logId: 1,
          note: 'One beautiful note',
          attachments: [],
          createdBy: 0,
          createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
          updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
        }]);
      })
      .expect(200);
  });

  it('can get affiliate log attachment', async () => {
    await request(app)
      .get(`/api/v1${attachment}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.text).to.contain('example file content');
        expect(res.headers).to.be.deep.oneOf([
          // original minio version
          {
            'x-powered-by': 'Express',
            'content-length': '20',
            'content-type': 'text/plain',
            date: res.headers.date,
            connection: 'close'
          },
          // new minio version (m1 compatible)
          {
            'x-powered-by': 'Express',
            'content-length': '20',
            'content-type': 'binary/octet-stream',
            date: res.headers.date,
            connection: 'close'
          },
        ]);

      })
      .expect(200);
  });

  it('can fail get affiliate log attachment if not authorized', async () => {
    await request(app)
      .get(`/api/v1${attachment}`)
      .expect(401);
  });
});
