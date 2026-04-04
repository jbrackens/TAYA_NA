/* @flow */
const { DateTime } = require('luxon');
const request = require('supertest');  

const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const logsRepository = require('../admin/affiliates/logs/repository');
const affiliatesRepository = require('../admin/affiliates/children/repository');
const repository = require('../admin/affiliates/repository');

const app = require('../../app');

describe('Affiliate Routes', () => {
  let token = '';
  let adminToken = '';
  let linkId;
  let apiToken;
  before(async () => {
    await request(app)
      .post('/api/v1/auth/affiliate/login')
      .send({
        email: 'elliot@gmail.com',
        password: '123456789',
      })
      .expect((res) => {
        token = res.header['x-auth-token'];
      })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/user/login')
      .send({
        email: 'admin@luckydino.com',
        password: 'Foobar123',
      })
      .expect((res) => {
        adminToken = res.header['x-auth-token'];
      })
      .expect(200);
  });

  it('can fail without token', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can fail with bad token', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', 'bad_token')
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can fail with admin token but no affiliate-id', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', adminToken)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can pass with admin token', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', adminToken)
      .set('affiliate-id', 3232323)
      .expect((res) => {
        expect(res.body.data).to.containSubset({
          affiliateId: 3232323,
        });
      })
      .expect(200);
  });

  it('can auth as child affiliate', async () => {
    const children = await affiliatesRepository.getChildrenAffiliates(pg, 3232323);
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', token)
      .set('child-id', children[0].id)
      .expect((res) => {
        expect(res.body.data).to.containSubset({
          affiliateId: children[0].id,
        });
      })
      .expect(200);
  });

  it('can auth as child affiliate with admin token', async () => {
    const children = await affiliatesRepository.getChildrenAffiliates(pg, 3232323);
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', adminToken)
      .set('affiliate-id', 3232323)
      .set('child-id', children[0].id)
      .expect((res) => {
        expect(res.body.data).to.containSubset({
          affiliateId: children[0].id,
        });
      })
      .expect(200);
  });

  it('fail auth as child affiliate with wrong child id', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', token)
      .set('child-id', 'wrong_child_id')
      .expect((res) => {
        expect(res.body.error).to.containSubset({
          message: 'Access denied.',
        });
      })
      .expect(401);
  });

  it('fail auth as child affiliate with admin token with wrong child id', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', adminToken)
      .set('affiliate-id', 3232323)
      .set('child-id', 'wrong_child_id')
      .expect((res) => {
        expect(res.body.error).to.containSubset({
          message: 'Access denied.',
        });
      })
      .expect(401);
  });

  it('cannot pass with legacy api token', async () => {
    await request(app)
      .get('/api/v1/affiliate?token=19A40351CD9E916FE7676CBDB02B3D76B3A2')
      .expect((res) => {
        expect(res.body).to.containSubset({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('fail pass with wrong api token', async () => {
    await request(app)
      .get('/api/v1/affiliate?token=19A40351CD9E916FE7676CBDB02B3D76B3A')
      .expect((res) => {
        expect(res.body).to.containSubset({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);
  });

  it('can get affiliate profile', async () => {
    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          affiliateId: 3232323,
          affiliateName: 'Giant Affiliate',

          contactName: 'Elliot Alderson',
          email: 'elliot@gmail.com',
          countryId: 'FI',
          address: 'Robinsoni 25',
          phone: null,
          skype: null,
          vatNumber: null,
          info: null,
          allowEmails: true,
          allowPayments: false,

          paymentMinAmount: 20000,
          paymentMethod: 'casinoaccount',
          paymentMethodDetails: {
            casinoAccountEmail: 'elliot@gmail.com',
          },
          accountBalance: 950000,

          createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
          updatedAt: res.body.data.updatedAt,
          lastLoginDate: res.body.data.lastLoginDate,
        });
      })
      .expect(200);
  });

  it('can update affiliate profile', async () => {
    await request(app)
      .put('/api/v1/affiliate')
      .set('x-auth-token', token)
      .send({
        name: 'Giant Affiliate',
        contactName: 'Elliot Alderson',
        email: 'elliot@gmail.com',
        countryId: 'FI',
        allowEmails: false,

        paymentMinAmount: 30000,
        paymentMethod: 'casinoaccount',
        paymentMethodDetails: {
          casinoAccountEmail: 'elliot2@gmail.com',
        },
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 3232323,
            affiliateName: 'Giant Affiliate',

            contactName: 'Elliot Alderson',
            email: 'elliot@gmail.com',
            countryId: 'FI',
            address: 'Robinsoni 25',
            phone: null,
            skype: null,
            vatNumber: null,
            info: null,
            allowEmails: false,

            paymentMinAmount: 30000,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: {
              casinoAccountEmail: 'elliot2@gmail.com',
            },
            accountBalance: 950000,

            createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: res.body.data.lastLoginDate,
          },
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal(
      "'allowEmails' changed from 'true' to 'false'\n'paymentMinAmount' changed from '20000' to '30000'\n'paymentMethodDetails' changed from '{\"casinoAccountEmail\":\"elliot@gmail.com\"}' to '{\"casinoAccountEmail\":\"elliot2@gmail.com\"}'",
    );
  });

  it('can update affiliate profile back', async () => {
    await request(app)
      .put('/api/v1/affiliate')
      .set('x-auth-token', token)
      .send({
        name: 'Giant Affiliate',
        contactName: 'Elliot Alderson',
        email: 'elliot@gmail.com',
        countryId: 'FI',
        allowEmails: true,

        paymentMinAmount: 20000,
        paymentMethod: 'casinoaccount',
        paymentMethodDetails: {
          casinoAccountEmail: 'elliot@gmail.com',
        },
      })
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 3232323,
            affiliateName: 'Giant Affiliate',

            contactName: 'Elliot Alderson',
            email: 'elliot@gmail.com',
            countryId: 'FI',
            address: 'Robinsoni 25',
            phone: null,
            skype: null,
            vatNumber: null,
            info: null,
            allowEmails: true,

            paymentMinAmount: 20000,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: {
              casinoAccountEmail: 'elliot@gmail.com',
            },
            accountBalance: 950000,

            createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: res.body.data.lastLoginDate,
          },
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 3232323);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal(
      "'allowEmails' changed from 'false' to 'true'\n'paymentMinAmount' changed from '30000' to '20000'\n'paymentMethodDetails' changed from '{\"casinoAccountEmail\":\"elliot2@gmail.com\"}' to '{\"casinoAccountEmail\":\"elliot@gmail.com\"}'",
    );
  });

  it('can get affiliate overview', async () => {
    await request(app)
      .get('/api/v1/affiliate/overview/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          nrc: {
            current: 0,
          },
          ndc: {
            current: 0,
          },
          conversionRate: {
            current: 0,
          },
          monthlyCommission: {
            current: 33440,
          },
          registeredCustomers: 4,
          depositingCustomers: 4,
          activePlayers: 4,

          netRevenue: 66400,
          cpa: 30400,
          commission: 3040,

          accountBalance: 950000,
        });
      });
  });

  it('can get affiliate revenue', async () => {
    await request(app)
      .get('/api/v1/affiliate/revenues/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
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
              {
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
              {
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
            ],
            totals: {
              deposits: 304000,
              turnover: 424000,
              grossRevenue: 78400,
              bonuses: -30400,
              adjustments: -36400,
              fees: -3040,
              tax: -3040,
              netRevenue: 66400,
              commission: 3040,
              cpa: 30400,
            },
            total: 33440,
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate revenue filtered by brand', async () => {
    await request(app)
      .get('/api/v1/affiliate/revenues/2019/11?brandId=LD')
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
                registrationDate: '2019-10-03T00:00:00.000Z',
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
            ],
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

  it('can get affiliate deals', async () => {
    await request(app)
      .get('/api/v1/affiliate/deals')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            deals: [
              {
                planId: 3,
                createdBy: 0,
                createdAt: DateTime.utc(2019, 10, 3, 18, 15, 30).toISO(),
                updatedAt: DateTime.utc(2019, 10, 3, 18, 15, 30).toISO(),
                brandId: 'LD',
                name: 'Global: 45% / FI: deposit: €100 cpa: €25',
                nrs: 45,
                isLadder: false,
                cpa: 1000,
                rules: [
                  {
                    ruleId: 7,
                    countryId: 'FI',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                  {
                    ruleId: 8,
                    countryId: 'DE',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                  {
                    ruleId: 9,
                    countryId: 'SE',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                ],
              },
              {
                planId: 1,
                createdBy: 0,
                createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
                updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toISO(),
                brandId: 'CJ',
                name: 'FI: deposit: €100 cpa: €25',
                nrs: null,
                isLadder: true,
                cpa: 0,
                rules: [
                  {
                    ruleId: 1,
                    countryId: 'FI',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                  {
                    ruleId: 2,
                    countryId: 'DE',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                  {
                    ruleId: 3,
                    countryId: 'SE',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                ],
              },
              {
                planId: 2,
                createdBy: 0,
                createdAt: DateTime.utc(2019, 10, 2, 18, 15, 30).toISO(),
                updatedAt: DateTime.utc(2019, 10, 2, 18, 15, 30).toISO(),
                brandId: 'KK',
                name: 'Global: 0% / FI: deposit: €100 cpa: €25',
                nrs: 0,
                isLadder: false,
                cpa: 1000,
                rules: [
                  {
                    ruleId: 4,
                    countryId: 'FI',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                  {
                    ruleId: 5,
                    countryId: 'DE',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                  {
                    ruleId: 6,
                    countryId: 'SE',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                ],
              },
              {
                planId: 4,
                createdBy: 0,
                createdAt: DateTime.utc(2019, 10, 4, 18, 15, 30).toISO(),
                updatedAt: DateTime.utc(2019, 10, 4, 18, 15, 30).toISO(),
                brandId: 'OS',
                name: 'Global: 50% / FI: deposit: €100 cpa: €25',
                nrs: 50.5,
                isLadder: false,
                cpa: 0,
                rules: [
                  {
                    ruleId: 10,
                    countryId: 'FI',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                  {
                    ruleId: 11,
                    countryId: 'DE',
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000,
                  },
                  {
                    ruleId: 12,
                    countryId: 'SE',
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500,
                  },
                ],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: '2019-10-14T18:15:30.000Z',
                updatedAt: '2019-10-14T18:15:30.000Z',
                brandId: 'FK',
                name: 'Zero Plan',
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: '2019-10-14T18:15:30.000Z',
                updatedAt: '2019-10-14T18:15:30.000Z',
                brandId: 'SN',
                name: 'Zero Plan',
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: '2019-10-14T18:15:30.000Z',
                updatedAt: '2019-10-14T18:15:30.000Z',
                brandId: 'VB',
                name: 'Zero Plan',
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
            ],
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate links', async () => {
    await request(app)
      .get('/api/v1/affiliate/links')
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

  it('can get affiliate link clicks', async () => {
    await request(app)
      .get('/api/v1/affiliate/links/4?from=2019-10-01&to=2020-10-01')
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
                cpa: 1100,
                commission: 110,
              },
              {
                date: '2019-10-01',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 1,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                cpa: 0,
                commission: 0,
              },
              {
                date: '2019-10-04',
                segment: 'dummy_segment',
                clicks: 0,
                nrc: 1,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                cpa: 0,
                commission: 0,
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
                cpa: 2500,
                commission: 250,
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
                cpa: 0,
                commission: 0,
              },
              {
                date: '2019-10-31',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 41000,
                turnover: 51000,
                grossRevenue: 8100,
                netRevenue: 7100,
                cpa: 4100,
                commission: 410,
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
                cpa: 1100,
                commission: 110,
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
                cpa: 0,
                commission: 0,
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
                cpa: 2500,
                commission: 250,
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
                cpa: 0,
                commission: 0,
              },
              {
                date: '2019-11-30',
                segment: '',
                clicks: 0,
                nrc: 0,
                ndc: 0,
                deposits: 40000,
                turnover: 50000,
                grossRevenue: 8000,
                netRevenue: 7000,
                cpa: 4000,
                commission: 400,
              },
              {
                date: '2019-11-30',
                segment: 'dummy_segment',
                clicks: 1,
                nrc: 0,
                ndc: 0,
                deposits: 0,
                turnover: 0,
                grossRevenue: 0,
                netRevenue: 0,
                cpa: 0,
                commission: 0,
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
              cpa: 15300,
              commission: 1530,
            },
            total: 16830,
          },
        });
      })
      .expect(200);
  });

  it('can create affiliate link', async () => {
    await request(app)
      .post('/api/v1/affiliate/links')
      .set('x-auth-token', token)
      .send({
        brandId: 'LD',
        name: 'TEST_LINK',
        landingPage: 'https://beta.luckydino.com/en',
      })
      .expect((res) => {
        linkId = res.body.data.link.linkId;
        expect(res.body.data.link).to.deep.equal({
          linkId,
          planId: null,
          brandId: 'LD',
          code: res.body.data.link.code,
          name: 'TEST_LINK',
          landingPage: 'https://beta.luckydino.com/en',
          deal: null,
        });
      })
      .expect(200);
  });

  it('can update affiliate link', async () => {
    await request(app)
      .put(`/api/v1/affiliate/links/${linkId}`)
      .set('x-auth-token', token)
      .send({
        name: 'TEST_LINK_2',
        landingPage: 'https://beta.luckydino.com/en',
      })
      .expect((res) => {
        expect(res.body.data.link).to.deep.equal({
          linkId,
          planId: null,
          brandId: 'LD',
          code: res.body.data.link.code,
          name: 'TEST_LINK_2',
          landingPage: 'https://beta.luckydino.com/en',
          deal: null,
        });
      })
      .expect(200);
  });

  it('can delete affiliate link', async () => {
    await request(app)
      .delete(`/api/v1/affiliate/links/${linkId}`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });

  it('can get affiliate landings', async () => {
    await request(app)
      .get(`/api/v1/affiliate/landings`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          landings: [
            {
              brandId: 'CJ',
              landingPage: 'https://beta.casinojefe.com/en',
            },
            {
              brandId: 'KK',
              landingPage: 'https://beta.kalevalakasino.com/en',
            },
            {
              brandId: 'LD',
              landingPage: 'https://beta.luckydino.com/en',
            },
            {
              brandId: 'OS',
              landingPage: 'https://beta.olaspill.com/en',
            },
            {
              brandId: 'CJ',
              landingPage: 'https://beta.casinojefe.com/custom',
            },
            {
              brandId: 'KK',
              landingPage: 'https://beta.kalevalakasino.com/custom',
            },
            {
              brandId: 'LD',
              landingPage: 'https://beta.luckydino.com/custom',
            },
            {
              brandId: 'OS',
              landingPage: 'https://beta.olaspill.com/custom',
            },
          ],
        });
      })
      .expect(200);
  });

  it('can get affiliate landings by brand', async () => {
    await request(app)
      .get(`/api/v1/affiliate/landings/LD`)
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          landings: [
            {
              brandId: 'LD',
              landingPage: 'https://beta.luckydino.com/en',
            },
            {
              brandId: 'LD',
              landingPage: 'https://beta.luckydino.com/custom',
            },
          ],
        });
      })
      .expect(200);
  });

  it('can get affiliate player activities for a month', async () => {
    await request(app)
      .get('/api/v1/affiliate/players/354733/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          activities: {
            items: [
              {
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
              },
              {
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
              },
              {
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
              },
            ],
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

  it('can get affiliate player activities', async () => {
    await request(app)
      .get('/api/v1/affiliate/players/354733')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          activities: {
            items: [
              {
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
              },
              {
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
              },
              {
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
              },
              {
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
              },
              {
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
              },
              {
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

  it('can get affiliate players', async () => {
    await request(app)
      .get('/api/v1/affiliate/players')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          revenues: {
            items: [
              {
                playerId: 354732,
                planId: 1,
                countryId: 'CA',
                brandId: 'CJ',
                deal: 'FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: DateTime.utc(2019, 11, 30, 18, 15, 30).toISO(),
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
              },
              {
                playerId: 354733,
                planId: 2,
                countryId: 'FI',
                brandId: 'KK',
                deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: DateTime.utc(2019, 11, 15, 18, 15, 30).toISO(),
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
              },
              {
                playerId: 354734,
                planId: 3,
                countryId: 'DE',
                brandId: 'LD',
                deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
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
              {
                playerId: 354735,
                planId: 4,
                countryId: 'NO',
                brandId: 'OS',
                deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
                link: 'Beautiful name of the Link',
                clickDate: DateTime.utc(2019, 10, 31, 18, 15, 30).toISO(),
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
              },
            ],
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
      .get('/api/v1/affiliate/players?brandId=LD')
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
                registrationDate: '2019-10-03T00:00:00.000Z',
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

  it('can get affiliate payments', async () => {
    await request(app)
      .get('/api/v1/affiliate/payments')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          payments: {
            items: [
              {
                paymentId: 4,
                transactionDate: DateTime.utc(2019, 11, 27, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 370000,
              },
              {
                paymentId: 3,
                transactionDate: DateTime.utc(2019, 11, 17, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 270000,
              },
              {
                paymentId: 2,
                transactionDate: DateTime.utc(2019, 11, 10, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 200000,
              },
              {
                paymentId: 1,
                transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
                type: 'Manual',
                description: 'transaction description',
                amount: 110000,
              },
            ],
            totals: {
              amount: 950000,
            },
            total: 950000,
          },
        });
      })
      .expect(200);
  });

  it('can get sub affiliates', async () => {
    await request(app)
      .get('/api/v1/affiliate/sub-affiliates/2019/11')
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

  const timeStamp = new Date().getTime();
  it('can create child affiliate', async () => {
    await request(app)
      .post('/api/v1/affiliate/children')
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
      .get('/api/v1/affiliate/children')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.affiliates).to.containSubset([
          {
            affiliateEmail: `child${timeStamp}@bravo.com`,
            affiliateName: 'Child Affiliate',
          },
        ]);
      })
      .expect(200);
  });

  it('can get affiliate activities', async () => {
    await request(app)
      .get('/api/v1/affiliate/activities?from=2019-10-01&to=2020-10-01')
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
      .get('/api/v1/affiliate/activities?from=2019-10-01&to=2020-10-01&brandId=LD')
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

  it('can refresh affiliate api token', async () => {
    await request(app)
      .post('/api/v1/affiliate/api-token')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.apiToken).to.not.equal(undefined);
      })
      .expect(200);
  });

  it('can get affiliate api token', async () => {
    await request(app)
      .get('/api/v1/affiliate/api-token')
      .set('x-auth-token', token)
      .expect((res) => {
        apiToken = res.body.data.apiToken;
        expect(res.body.data.apiToken).to.not.equal(undefined);
      })
      .expect(200);
  });

  it('can access affiliate api with token', async () => {
    await request(app)
      .get(`/api/v1/affiliate?token=${apiToken}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 3232323,
            affiliateName: 'Giant Affiliate',

            contactName: 'Elliot Alderson',
            email: 'elliot@gmail.com',
            countryId: 'FI',
            address: 'Robinsoni 25',
            phone: null,
            skype: null,
            vatNumber: null,
            info: null,
            allowEmails: true,
            allowPayments: false,

            paymentMinAmount: 20000,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: {
              casinoAccountEmail: 'elliot@gmail.com',
            },
            accountBalance: 950000,

            createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: res.body.data.lastLoginDate,
          },
        });
      })
      .expect(200);
  });

  it('cannot access affiliate with old api token', async () => {
    await request(app)
      .post('/api/v1/affiliate/api-token')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data.apiToken).to.not.equal(undefined);
      })
      .expect(200);

    await request(app)
      .get(`/api/v1/affiliate?token=${apiToken}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied.',
          },
        });
      })
      .expect(401);

    await request(app)
      .get('/api/v1/affiliate/api-token')
      .set('x-auth-token', token)
      .expect((res) => {
        apiToken = res.body.data.apiToken;
        expect(res.body.data.apiToken).to.not.equal(undefined);
      })
      .expect(200);

    await request(app)
      .get(`/api/v1/affiliate?token=${apiToken}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          data: {
            affiliateId: 3232323,
            affiliateName: 'Giant Affiliate',

            contactName: 'Elliot Alderson',
            email: 'elliot@gmail.com',
            countryId: 'FI',
            address: 'Robinsoni 25',
            phone: null,
            skype: null,
            vatNumber: null,
            info: null,
            allowEmails: true,
            allowPayments: false,

            paymentMinAmount: res.body.data.paymentMinAmount,
            paymentMethod: 'casinoaccount',
            paymentMethodDetails: {
              casinoAccountEmail: 'elliot@gmail.com',
            },
            accountBalance: 950000,

            createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30).toISO(),
            updatedAt: res.body.data.updatedAt,
            lastLoginDate: res.body.data.lastLoginDate,
          },
        });
      })
      .expect(200);
  });

  it('can fail access api by closed affiliate', async () => {
    const affiliate: any = await repository.findAffiliateByEmail(pg, 'elliot@gmail.com');
    affiliate.isClosed = true;
    await repository.updateAffiliate(pg, affiliate.id, affiliate);

    await request(app)
      .get('/api/v1/affiliate')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    await request(app)
      .get('/api/v1/affiliate/overview/2019/11')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    await request(app)
      .get('/api/v1/affiliate/links')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    await request(app)
      .get('/api/v1/affiliate/players')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    await request(app)
      .get('/api/v1/affiliate/payments')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    await request(app)
      .get('/api/v1/affiliate/api-token')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Affiliate account is closed',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(403);

    affiliate.isClosed = false;
    await repository.updateAffiliate(pg, affiliate.id, affiliate);
  });

  it('can get affiliate view fee info', async () => {
    const expectedResp = [];
    const dbAffFees = await pg('admin_fee_affiliates')
      .select()
      .where({ affiliateId: 3232323 })
      .whereNull('removedAt')
      .whereRaw('upper(period) > now()');
    for (const dbAffFee of dbAffFees) {
      const dbFee = await pg('admin_fees').first().where({ id: dbAffFee.adminFeeId });
      const dbDraftFee = await pg('admin_fees').first().where({ draftId: dbFee.id });
      const dbRules = await pg('admin_fee_rules')
        .select()
        .where({ adminFeeId: dbFee.id })
        .whereNull('draftId');
      expectedResp.push({
        affiliateFeeId: dbAffFee.id,
        affiliateId: 3232323,
        adminFeeId: dbAffFee.adminFeeId,
        brandId: dbAffFee.brandId,
        isRunning: dbAffFee.period.contains(DateTime.local()),
        periodFrom: dbAffFee.period.start.toISODate(),
        periodTo: dbAffFee.period.end.minus({ days: 1 }).toISODate(),
        createdBy: dbAffFee.createdBy,
        name: dbDraftFee.name,
        percent: dbFee.percent,
        active: dbFee.active,
        rules: dbRules.map((r) => ({
          countryId: r.countryId,
          percent: r.percent,
        })),
      });
    }
    await request(app)
      .get('/api/v1/affiliate/fees')
      .set('x-auth-token', token)
      .expect(({ body }) => {
        const { fees: respFees } = body.data;
        expect(respFees.length).to.equal(expectedResp.length);
        expect(_.sortBy(body.data.fees, 'affiliateFeeId')).to.deep.equal(
          _.sortBy(expectedResp, 'affiliateFeeId'),
        );
      });
  });
});
