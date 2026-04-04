/* @flow */
const { DateTime } = require('luxon');
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');

const app = require('../../../../app');
const logsRepository = require('../logs/repository');

describe('Players Routes', () => {
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

  it('can get affiliate players', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/players')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [{
              playerId: 354732,
              planId: 1,
              countryId: 'CA',
              brandId: 'CJ',
              deal: 'FI: deposit: €100 cpa: €25',
              link: 'Beautiful name of the Link',
              clickDate: '2019-11-30T18:15:30.000Z',
              referralId: 'sampleRetardId',
              segment: 'dummy_segment',
              registrationDate: DateTime.utc(2019, 10, 1).toISO(),
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
              netRevenue: 33300,
              commission: 1530,
              cpa: 15300,
            }, {
              playerId: 354733,
              planId: 2,
              countryId: 'FI',
              brandId: 'KK',
              deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
              link: 'Beautiful name of the Link',
              clickDate: '2019-11-15T18:15:30.000Z',
              referralId: 'sampleRetardId',
              segment: 'dummy_segment',
              registrationDate: DateTime.utc(2019, 10, 2).toISO(),
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
              netRevenue: 33300,
              commission: 1530,
              cpa: 15300,
            }, {
              playerId: 354734,
              planId: 3,
              countryId: 'DE',
              brandId: 'LD',
              deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
              link: 'Beautiful name of the Link',
              clickDate: '2019-11-01T18:15:30.000Z',
              referralId: 'sampleRetardId',
              segment: 'dummy_segment',
              registrationDate: DateTime.utc(2019, 10, 3).toISO(),
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
              netRevenue: 33300,
              commission: 1530,
              cpa: 15300,
            }, {
              playerId: 354735,
              planId: 4,
              countryId: 'NO',
              brandId: 'OS',
              deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
              link: 'Beautiful name of the Link',
              clickDate: '2019-10-31T18:15:30.000Z',
              referralId: 'sampleRetardId',
              segment: 'dummy_segment',
              registrationDate: DateTime.utc(2019, 10, 4).toISO(),
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
              netRevenue: 33300,
              commission: 1530,
              cpa: 15300,
            }],
            totals: {
              deposits: 612000,
              turnover: 852000,
              grossRevenue: 157200,
              bonuses: -61200,
              adjustments: -73200,
              fees: -6120,
              tax: -6120,
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

  it('can get affiliate players filtered by brand', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/players?brandId=LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
                playerId: 354734,
                planId: 3,
                countryId: 'DE',
                brandId: 'LD',
                deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: '2019-11-01T18:15:30.000Z',
                referralId: 'sampleRetardId',
                segment: 'dummy_segment',
                registrationDate: DateTime.utc(2019, 10, 3).toISO(),
                deposits: 153000,
                turnover: 213000,
                grossRevenue: 39300,
                bonuses: -15300,
                adjustments: -18300,
                fees: -1530,
                tax: -1530,
                netRevenue: 33300,
                commission: 1530,
                cpa: 15300,
              },
            ],
            totals: {
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
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

  it('can get affiliate player activities', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/players/354733')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          activities: {
            items: [{
              activityId: 7,
              activityDate: '2019-10-01',
              deposits: 11000,
              turnover: 21000,
              grossRevenue: 5100,
              bonuses: -1100,
              adjustments: -1600,
              fees: -110,
              tax: -110,
              netRevenue: 4100,
              commission: 110,
              cpa: 1100,
            }, {
              activityId: 8,
              activityDate: '2019-10-15',
              deposits: 25000,
              turnover: 35000,
              grossRevenue: 6500,
              bonuses: -2500,
              adjustments: -3000,
              fees: -250,
              tax: -250,
              netRevenue: 5500,
              commission: 250,
              cpa: 2500,
            }, {
              activityId: 9,
              activityDate: '2019-10-31',
              deposits: 41000,
              turnover: 51000,
              grossRevenue: 8100,
              bonuses: -4100,
              adjustments: -4600,
              fees: -410,
              tax: -410,
              netRevenue: 7100,
              commission: 410,
              cpa: 4100,
            }, {
              activityId: 10,
              activityDate: '2019-11-01',
              deposits: 11000,
              turnover: 21000,
              grossRevenue: 5100,
              bonuses: -1100,
              adjustments: -1600,
              fees: -110,
              tax: -110,
              netRevenue: 4100,
              commission: 110,
              cpa: 1100,
            }, {
              activityId: 11,
              activityDate: '2019-11-15',
              deposits: 25000,
              turnover: 35000,
              grossRevenue: 6500,
              bonuses: -2500,
              adjustments: -3000,
              fees: -250,
              tax: -250,
              netRevenue: 5500,
              commission: 250,
              cpa: 2500,
            }, {
              activityId: 12,
              activityDate: '2019-11-30',
              deposits: 40000,
              turnover: 50000,
              grossRevenue: 8000,
              bonuses: -4000,
              adjustments: -4500,
              fees: -400,
              tax: -400,
              netRevenue: 7000,
              commission: 400,
              cpa: 4000,
            }],
            totals: {
              deposits: 153000,
              turnover: 213000,
              grossRevenue: 39300,
              bonuses: -15300,
              adjustments: -18300,
              fees: -1530,
              tax: -1530,
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

  it('can get affiliate player activities for a month', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/players/354733/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          activities: {
            items: [{
              activityId: 10,
              activityDate: '2019-11-01',
              deposits: 11000,
              turnover: 21000,
              grossRevenue: 5100,
              bonuses: -1100,
              adjustments: -1600,
              fees: -110,
              tax: -110,
              netRevenue: 4100,
              commission: 110,
              cpa: 1100,
            }, {
              activityId: 11,
              activityDate: '2019-11-15',
              deposits: 25000,
              turnover: 35000,
              grossRevenue: 6500,
              bonuses: -2500,
              adjustments: -3000,
              fees: -250,
              tax: -250,
              netRevenue: 5500,
              commission: 250,
              cpa: 2500,
            }, {
              activityId: 12,
              activityDate: '2019-11-30',
              deposits: 40000,
              turnover: 50000,
              grossRevenue: 8000,
              bonuses: -4000,
              adjustments: -4500,
              fees: -400,
              tax: -400,
              netRevenue: 7000,
              commission: 400,
              cpa: 4000,
            }],
            totals: {
              deposits: 76000,
              turnover: 106000,
              grossRevenue: 19600,
              bonuses: -7600,
              adjustments: -9100,
              fees: -760,
              tax: -760,
              netRevenue: 16600,
              commission: 760,
              cpa: 7600,
            },
            total: 8360,
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate player activities for a month with zero floored commission', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/100000/players/555555/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          activities: {
            items: [{
              activityId: 73,
              activityDate: '2019-11-15',
              deposits: 10000,
              turnover: 300000,
              grossRevenue: 100000,
              bonuses: -10000,
              adjustments: -20000,
              fees: -25000,
              tax: 0,
              netRevenue: 45000,
              commission: 11250,
              cpa: 4500,
            }, {
              activityId: 81,
              activityDate: '2019-11-16',
              deposits: 200000,
              turnover: 300000,
              grossRevenue: -100000,
              bonuses: -10000,
              adjustments: -20000,
              fees: 0,
              tax: 0,
              netRevenue: -130000,
              commission: -32500,
              cpa: 0,
            }],
            totals: {
              deposits: 210000,
              turnover: 600000,
              grossRevenue: 0,
              bonuses: -20000,
              adjustments: -40000,
              fees: -25000,
              tax: 0,
              netRevenue: -85000,
              commission: 0,
              cpa: 4500,
            },
            total: 4500,
          },
        });
      })
      .expect(200);
  });

  it('can update affiliate player', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/3232323/players/354732')
      .set('x-auth-token', token)
      .send({
        affiliateId: 3232323,
        planId: 1,
        linkId: 1,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal("'Link' changed from 'Beautiful name of the Link' to 'Beautiful name of the Link'");
  });

  it('can update affiliate player plan', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/3232323/players/354732')
      .set('x-auth-token', token)
      .send({
        affiliateId: 3232323,
        planId: 2,
        linkId: 1,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal("'Plan' changed from 'FI: deposit: €100 cpa: €25' to 'Global: 0% / FI: deposit: €100 cpa: €25'");
  });

  it('can change player\'s affiliate', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/3232323/players/354732')
      .set('x-auth-token', token)
      .send({
        affiliateId: 7676767,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal("'affiliateId' changed from '3232323' to '7676767'");

    const logs2 = await logsRepository.getAffiliateLogs(pg, 7676767);
    const lastLog2 = logs2[0];
    expect(lastLog2.note).to.deep.equal("'affiliateId' changed from '3232323' to '7676767'");
  });

  it('can change player\'s affiliate back', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/7676767/players/354732')
      .set('x-auth-token', token)
      .send({
        affiliateId: 3232323,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

      const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
      const lastLog = logs[0];
      expect(lastLog.note).to.deep.equal("'affiliateId' changed from '7676767' to '3232323'");

      const logs2 = await logsRepository.getAffiliateLogs(pg, 7676767);
      const lastLog2 = logs2[0];
      expect(lastLog2.note).to.deep.equal("'affiliateId' changed from '7676767' to '3232323'");
  });

  it('can partially update affiliate player', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/3232323/players/354732')
      .set('x-auth-token', token)
      .send({
        planId: 2,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);

    await request(app)
      .put('/api/v1/admin/affiliates/3232323/players/354732')
      .set('x-auth-token', token)
      .send({
        planId: 1,
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });
});
