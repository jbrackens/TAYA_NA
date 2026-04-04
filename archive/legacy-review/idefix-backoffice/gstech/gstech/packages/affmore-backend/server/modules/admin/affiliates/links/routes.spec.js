/* @flow */
const request = require('supertest');  

const app = require('../../../../app');

describe('Links Routes', () => {
  let token = '';
  let linkId;
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

  it('can get affiliate links', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/links')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.links).to.deep.equal([
          {
            linkId: 1,
            planId: null,
            brandId: 'CJ',
            code: res.body.data.links[0].code,
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
            deal: null,
          },
          {
            linkId: 2,
            planId: null,
            brandId: 'KK',
            code: res.body.data.links[1].code,
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
            deal: null,
          },
          {
            linkId: 3,
            planId: null,
            brandId: 'LD',
            code: res.body.data.links[2].code,
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
            deal: null,
          },
          {
            linkId: 4,
            planId: null,
            brandId: 'OS',
            code: res.body.data.links[3].code,
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
            deal: null,
          },
        ]);
      })
      .expect(200);
  });

  it('can get links filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/links?brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.links).to.deep.equal([
          {
            linkId: 3,
            planId: null,
            brandId: 'LD',
            code: res.body.data.links[0].code,
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
            deal: null,
          }
        ]);
      })
      .expect(200);
  });


  it('can get affiliate link clicks', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/5454545/links/5?from=2019-10-01&to=2020-10-01')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          clicks: {
            items: [
              {
                date: '2019-10-01',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 11000,
                turnover: 21000,
                grossRevenue: 5100,
                netRevenue: 4100,
                commission: 110,
                cpa: 1100,
              },
              {
                date: '2019-10-01',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 1,
                ndc: 1,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                commission: 0,
                cpa: 0,
              },
              {
                date: '2019-10-15',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 25000,
                turnover: 35000,
                grossRevenue: 6500,
                netRevenue: 5500,
                commission: 250,
                cpa: 2500,
              },
              {
                date: '2019-10-15',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                commission: 0,
                cpa: 0,
              },
              {
                date: '2019-10-31',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 41000,
                turnover: 51000,
                grossRevenue: 8100,
                netRevenue: 7100,
                commission: 410,
                cpa: 4100,
              },
              {
                date: '2019-10-31',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                commission: 0,
                cpa: 0,
              },
              {
                date: '2019-11-01',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 11000,
                turnover: 21000,
                grossRevenue: 5100,
                netRevenue: 4100,
                commission: 110,
                cpa: 1100,
              },
              {
                date: '2019-11-01',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                commission: 0,
                cpa: 0,
              },
              {
                date: '2019-11-15',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 25000,
                turnover: 35000,
                grossRevenue: 6500,
                netRevenue: 5500,
                commission: 250,
                cpa: 2500,
              },
              {
                date: '2019-11-15',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                commission: 0,
                cpa: 0,
              },
              {
                date: '2019-11-30',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 40000,
                turnover: 50000,
                grossRevenue: 8000,
                netRevenue: 7000,
                commission: 400,
                cpa: 4000,
              },
            ],
            totals: {
              clicks: 6,
              nrc: 1,
              ndc: 1,
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              netRevenue: 33300,
              commission: 1530,
              cpa: 15300,
            },
            total: 16830,
          },
        });
      })
      .expect(200);
  });

  it('can create affiliate link', async () => {
    await request(app)
      .post('/api/v1/admin/affiliates/3232323/links')
      .set('x-auth-token', token)
      .send({
        brandId: 'LD',
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
      })
      .expect((res) => {
        linkId = res.body.data.link.linkId;
        expect(res.body.data.link).to.deep.equal({
          linkId,
          planId: null,
          brandId: 'LD',
          code: res.body.data.link.code,
          name: 'Beautiful name of the Link',
          landingPage: 'https://beta.luckydino.com/en',
          deal: null,
        });
      })
      .expect(200);
  });

  it('can update affiliate link', async () => {
    await request(app)
      .put(`/api/v1/admin/affiliates/3232323/links/${linkId}`)
      .set('x-auth-token', token)
      .send({
        planId: 1,
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
      })
      .expect((res) => {
        expect(res.body.data.link).to.deep.equal({
          linkId,
          planId: 1,
          brandId: 'LD',
          code: res.body.data.link.code,
          name: 'Beautiful name of the Link',
          landingPage: 'https://beta.luckydino.com/en',
          deal: 'FI: deposit: €100 cpa: €25',
        });
      })
      .expect(200);
  });

  it('fails update brandId for affiliate link', async () => {
    await request(app)
      .put(`/api/v1/admin/affiliates/3232323/links/${linkId}`)
      .set('x-auth-token', token)
      .send({
        planId: 1,
        brandId: 'CJ',
        name: 'Beautiful name of the Link',
        landingPage: 'https://beta.luckydino.com/en',
      })
      .expect((res) => {
        expect(res.body.error).to.deep.equal({
          message: 'Changing brand for links is not possible',
        });
      })
      .expect(403);
  });

  it('can delete affiliate link', async () => {
    await request(app)
      .delete(`/api/v1/admin/affiliates/3232323/links/${linkId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });
});
