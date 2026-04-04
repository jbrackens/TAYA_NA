/* @flow */
const _ = require('lodash');
const request = require('supertest');  
const app = require('../../../../app');

const timeStamp = new Date().getTime();

describe('Children Affiliates Routes', () => {
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

  it('can create child affiliate', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/3232323/children')
      .send({
        email: `child${timeStamp}@bravo.com`,
        name: 'Child Affiliate',
        info: 'Some info',
      })
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can get children affiliates', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/children')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(_.last(res.body.data.affiliates)).to.deep.equal({
          affiliateEmail: `child${timeStamp}@bravo.com`,
          affiliateId: _.last(res.body.data.affiliates).affiliateId,
          affiliateName: 'Child Affiliate',
        });
      })
      .expect(200);
  });
});
