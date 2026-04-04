/* @flow */
const request = require('supertest');  

const app = require('../../../../app');

describe('Activities Routes', () => {
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

  it('can get affiliate activities', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/activities?from=2019-10-01&to=2020-10-01')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.containSubset({
          activities: {
            items: [
              {
                link: 'Beautiful name of the Link',
                linkId: 1,
                segment: 'dummy_segment',
                brandId: 'CJ',
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
              {
                link: 'Beautiful name of the Link',
                linkId: 2,
                segment: 'dummy_segment',
                brandId: 'KK',
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
              {
                link: 'Beautiful name of the Link',
                linkId: 3,
                segment: 'dummy_segment',
                brandId: 'LD',
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
              {
                link: 'Beautiful name of the Link',
                linkId: 4,
                segment: 'dummy_segment',
                brandId: 'OS',
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
            ],
            totals: {
              nrc: 4,
              clicks: 24,
              ndc: 4,
              deposits: 612000,
              turnover: 852000,
              grossRevenue: 157200,
              netRevenue: 133200,
              commission: 6120,
              cpa: 61200,
            },
            total: 67320,
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate activities filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/activities?from=2019-10-01&to=2020-10-01&brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.containSubset({
          activities: {
            items: [
              {
                link: 'Beautiful name of the Link',
                linkId: 3,
                segment: 'dummy_segment',
                brandId: 'LD',
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
});
