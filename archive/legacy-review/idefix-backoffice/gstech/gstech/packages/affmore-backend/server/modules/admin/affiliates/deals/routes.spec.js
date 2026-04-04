/* @flow */
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');

const logger = require('gstech-core/modules/logger');
const logsRepository = require('../logs/repository');
const app = require('../../../../app');

describe('Deals Routes', () => {
  let token = '';

  let createdAt;
  let updatedAt;

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

  it('can create deal', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/5454545/deals')
      .set('x-auth-token', token)
      .send({
        affiliateId: 5454545,
        planId: 1,
        brandId: 'LD',
      })
      .expect((res) => {
        createdAt = res.body.data.deal.createdAt;
        updatedAt = res.body.data.deal.updatedAt;

        expect(res.body.data).to.deep.equal({
          deal: {
            planId: 1,
            createdBy: 0,
            createdAt,
            updatedAt,
            brandId: 'LD',
            name: 'FI: deposit: €100 cpa: €25',
            nrs: null,
            isLadder: true,
            cpa: 0,
            rules: [{
              ruleId: 1,
              countryId: 'FI',
              nrs: 25,
              cpa: 1000,
              deposit: 15000,
              deposit_cpa: 3000,
            }, {
              ruleId: 2,
              countryId: 'DE',
              nrs: 30,
              cpa: 2000,
              deposit: 10000,
              deposit_cpa: 2500,
            }, {
              ruleId: 3,
              countryId: 'SE',
              nrs: 25,
              cpa: 1000,
              deposit: 15000,
              deposit_cpa: 3000,
            }],
          },
        });
      })
      .expect(200);
  });

  it('can get affiliate deals', async () => {
    await request(app)
      .get('/api/v1/admin/affiliates/3232323/deals')
      .set('x-auth-token', token)
      .expect((res) => {
        logger.error(res.body);
        expect(res.body).to.deep.equal({
          data: {
            deals: [
              {
                planId: 3,
                createdBy: 0,
                createdAt: "2019-10-03T18:15:30.000Z",
                updatedAt: "2019-10-03T18:15:30.000Z",
                brandId: "LD",
                name: "Global: 45% / FI: deposit: €100 cpa: €25",
                nrs: 45,
                isLadder: false,
                cpa: 1000,
                rules: [
                  {
                    ruleId: 7,
                    countryId: "FI",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  },
                  {
                    ruleId: 8,
                    countryId: "DE",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  },
                  {
                    ruleId: 9,
                    countryId: "SE",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  }
                ]
              },
              {
                planId: 1,
                createdBy: 0,
                createdAt: "2019-10-01T18:15:30.000Z",
                updatedAt: "2019-10-01T18:15:30.000Z",
                brandId: "CJ",
                name: "FI: deposit: €100 cpa: €25",
                nrs: null,
                isLadder: true,
                cpa: 0,
                rules: [
                  {
                    ruleId: 1,
                    countryId: "FI",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  },
                  {
                    ruleId: 2,
                    countryId: "DE",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  },
                  {
                    ruleId: 3,
                    countryId: "SE",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  }
                ]
              },
              {
                planId: 2,
                createdBy: 0,
                createdAt: "2019-10-02T18:15:30.000Z",
                updatedAt: "2019-10-02T18:15:30.000Z",
                brandId: "KK",
                name: "Global: 0% / FI: deposit: €100 cpa: €25",
                nrs: 0,
                isLadder: false,
                cpa: 1000,
                rules: [
                  {
                    ruleId: 4,
                    countryId: "FI",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  },
                  {
                    ruleId: 5,
                    countryId: "DE",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  },
                  {
                    ruleId: 6,
                    countryId: "SE",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  }
                ]
              },
              {
                planId: 4,
                createdBy: 0,
                createdAt: "2019-10-04T18:15:30.000Z",
                updatedAt: "2019-10-04T18:15:30.000Z",
                brandId: "OS",
                name: "Global: 50% / FI: deposit: €100 cpa: €25",
                nrs: 50.5,
                isLadder: false,
                cpa: 0,
                rules: [
                  {
                    ruleId: 10,
                    countryId: "FI",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  },
                  {
                    ruleId: 11,
                    countryId: "DE",
                    nrs: 25,
                    cpa: 1000,
                    deposit: 15000,
                    deposit_cpa: 3000
                  },
                  {
                    ruleId: 12,
                    countryId: "SE",
                    nrs: 30,
                    cpa: 2000,
                    deposit: 10000,
                    deposit_cpa: 2500
                  },
                ],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: "2019-10-14T18:15:30.000Z",
                updatedAt: "2019-10-14T18:15:30.000Z",
                brandId: "FK",
                name: "Zero Plan",
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: "2019-10-14T18:15:30.000Z",
                updatedAt: "2019-10-14T18:15:30.000Z",
                brandId: "SN",
                name: "Zero Plan",
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
              {
                planId: 500,
                createdBy: 0,
                createdAt: "2019-10-14T18:15:30.000Z",
                updatedAt: "2019-10-14T18:15:30.000Z",
                brandId: "VB",
                name: "Zero Plan",
                nrs: 0,
                isLadder: false,
                cpa: 0,
                rules: [],
              },
            ]
          },
        });
      })
      .expect(200);
  });

  it('can update deal', async () => {
    await request(app)
      .put('/api/v1/admin/affiliates/5454545/deals')
      .set('x-auth-token', token)
      .send({
        affiliateId: 5454545,
        planId: 2,
        brandId: 'LD',
      })
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          deal: {
            planId: 2,
            createdBy: 0,
            createdAt: res.body.data.deal.createdAt,
            updatedAt: res.body.data.deal.updatedAt,
            brandId: 'LD',
            name: 'Global: 0% / FI: deposit: €100 cpa: €25',
            nrs: 0,
            isLadder: false,
            cpa: 1000,
            rules: [{
              ruleId: 4,
              countryId: 'FI',
              nrs: 30,
              cpa: 2000,
              deposit: 10000,
              deposit_cpa: 2500,
            }, {
              ruleId: 5,
              countryId: 'DE',
              nrs: 25,
              cpa: 1000,
              deposit: 15000,
              deposit_cpa: 3000,
            }, {
              ruleId: 6,
              countryId: 'SE',
              nrs: 30,
              cpa: 2000,
              deposit: 10000,
              deposit_cpa: 2500,
            }],
          },
        });
      })
      .expect(200);

    const logs = await logsRepository.getAffiliateLogs(pg, 5454545);
    const lastLog = logs[0];
    expect(lastLog.note).to.deep.equal("'Plan' changed from 'FI: deposit: €100 cpa: €25' to 'Global: 0% / FI: deposit: €100 cpa: €25'");
  });

  it('can delete deal', async () => {
    await request(app)
      .delete('/api/v1/admin/affiliates/5454545/deals/LD')
      .set('x-auth-token', token)
      .expect((res) => {
        expect(res.body.data).to.deep.equal({
          ok: true,
        });
      })
      .expect(200);
  });
});
