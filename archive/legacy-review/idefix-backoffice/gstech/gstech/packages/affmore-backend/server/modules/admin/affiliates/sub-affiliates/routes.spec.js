/* @flow */
const request = require('supertest');  
const app = require('../../../../app');

describe('Sub Affiliates Routes', () => {
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

  it('can create sub affiliate', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/3232323/sub-affiliates/100001')
      .send({
        commissionShare: 20,
      })
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can update sub affiliate', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/3232323/sub-affiliates/100001')
      .send({
        commissionShare: 25,
      })
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can delete sub affiliate', async () => {
    await request(app)
      .delete('/api/v1/admin/affiliates/3232323/sub-affiliates/100001')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can get sub affiliates', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/sub-affiliates/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          affiliates: {
            items: [
              {
                affiliateId: 100000,
                affiliateName: 'Random Affiliate',
                commissionShare: 10,
                nrc: 1,
                ndc: 1,
                registeredCustomers: 11,
                depositingCustomers: 1,
                netRevenue: -85000,
                commission: 0,
              },
              {
                affiliateId: 100004,
                affiliateName: 'Random Affiliate',
                commissionShare: 10,
                nrc: 0,
                ndc: 0,
                registeredCustomers: 10,
                depositingCustomers: 0,
                netRevenue: 0,
                commission: 0,
              },
              {
                affiliateId: 100008,
                affiliateName: 'Random Affiliate',
                commissionShare: 10,
                nrc: 0,
                ndc: 0,
                registeredCustomers: 10,
                depositingCustomers: 0,
                netRevenue: 0,
                commission: 0,
              },
              {
                affiliateId: 100012,
                affiliateName: 'Random Affiliate',
                commissionShare: 10,
                nrc: 0,
                ndc: 0,
                registeredCustomers: 10,
                depositingCustomers: 0,
                netRevenue: 0,
                commission: 0,
              },
              {
                affiliateId: 100016,
                affiliateName: 'Random Affiliate',
                commissionShare: 10,
                nrc: 0,
                ndc: 0,
                registeredCustomers: 10,
                depositingCustomers: 0,
                netRevenue: 0,
                commission: 0,
              },
            ],
            totals: {
              nrc: 1,
              ndc: 1,
              registeredCustomers: 51,
              depositingCustomers: 1,
              netRevenue: -85000,
              commission: 0,
            },
            total: 0,
          },
        });
      })
      .expect(200);
  });
});
