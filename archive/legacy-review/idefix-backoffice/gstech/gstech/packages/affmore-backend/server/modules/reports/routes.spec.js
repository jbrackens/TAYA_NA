/* @flow */
const request = require('supertest');  
const pg = require('gstech-core/modules/pg');
const app = require('../../app');
const affiliatesRepository = require('../admin/affiliates/repository');
const linksRepository = require('../admin/affiliates/links/repository');

describe('Reports Routes', () => {
  it('can get combined report', async () => {
    const affiliate: any = await affiliatesRepository.getAffiliate(pg, 3232323);
    const link = await linksRepository.getAffiliateLink(pg, 3232323, 3);

    await request(app)
      .get(`/api/reports/0/combined/2019/10?token=${affiliate.apiToken}`)
      .expect((res) => {
        expect(res.body).to.containSubset([
          {
            id: link.code,
            name: 'Beautiful name of the Link',
            tags: [],
            report: {
              dates: [
                {
                  activityDate: '20191001',
                  clicks: 1,
                  registrations: 0,
                  firstDeposits: 1,
                  tags: [],
                  deposits: '110.00',
                  turnover: '210.00',
                  grossRevenue: '51.00',
                  bonuses: '11.00',
                  adjustments: '16.00',
                  fees: '1.10',
                  tax: '1.10',
                  taxRate: '0.00',
                  netRevenue: '41.00',
                  commission: '1.10',
                  cpa: '11.00',
                  cpaCount: 1,
                },
                {
                  activityDate: '20191015',
                  clicks: 1,
                  registrations: 0,
                  firstDeposits: 0,
                  tags: [],
                  deposits: '250.00',
                  turnover: '350.00',
                  grossRevenue: '65.00',
                  bonuses: '25.00',
                  adjustments: '30.00',
                  fees: '2.50',
                  tax: '2.50',
                  taxRate: '0.00',
                  netRevenue: '55.00',
                  commission: '2.50',
                  cpa: '25.00',
                  cpaCount: 1,
                },
                {
                  activityDate: '20191031',
                  clicks: 1,
                  registrations: 0,
                  firstDeposits: 0,
                  tags: [],
                  deposits: '410.00',
                  turnover: '510.00',
                  grossRevenue: '81.00',
                  bonuses: '41.00',
                  adjustments: '46.00',
                  fees: '4.10',
                  tax: '4.10',
                  taxRate: '0.00',
                  netRevenue: '71.00',
                  commission: '4.10',
                  cpa: '41.00',
                  cpaCount: 1,
                },
              ],
              totals: {
                clicks: 3,
                registrations: 1,
                firstDeposits: 1,
                fees: '7.70',
                tax: '7.70',
                netRevenue: '167.00',
                commission: '7.70',
                commissionAfterTax: '0.00',
                cpa: '77.00',
                cpaCount: 3,
                total: '84.70',
              },
            },
          },
        ]);
      })
      .expect(200);
  });

  it('can get combined segments report', async () => {
    const affiliate: any = await affiliatesRepository.getAffiliate(pg, 3232323);
    const link = await linksRepository.getAffiliateLink(pg, 3232323, 3);

    await request(app)
      .get(`/api/reports/0/combined-segments/2019/10?token=${affiliate.apiToken}`)
      .expect((res) => {
        expect(res.body).to.containSubset([
          {
            id: link.code,
            name: 'Beautiful name of the Link',
            segment: 'dummy_segment',
            report: {
              dates: [],
              totals: {
                clicks: 3,
                registrations: 1,
                firstDeposits: 1,
                fees: '7.70',
                tax: '7.70',
                netRevenue: '167.00',
                commission: '7.70',
                commissionAfterTax: '0.00',
                cpa: '77.00',
                cpaCount: 3,
                total: '84.70',
              },
            },
          },
        ]);
      })
      .expect(200);
  });

  it('can get media report', async () => {
    const affiliate: any = await affiliatesRepository.getAffiliate(pg, 3232323);
    const link = await linksRepository.getAffiliateLink(pg, 3232323, 3);

    await request(app)
      .get(`/api/reports/0/media/id/${link.code}/overview/2019/10?token=${affiliate.apiToken}`)
      .expect((res) => {
        expect(res.body).to.containSubset({
          dates: [
            {
              activityDate: '20191001',
              clicks: 1,
              registrations: 0,
              firstDeposits: 1,
              tags: [],
              deposits: '110.00',
              turnover: '210.00',
              grossRevenue: '51.00',
              bonuses: '11.00',
              adjustments: '16.00',
              fees: '1.10',
              tax: '1.10',
              taxRate: '0.00',
              netRevenue: '41.00',
              commission: '1.10',
              cpa: '11.00',
              cpaCount: 1,
            },
            {
              activityDate: "20191003",
              adjustments: "0.00",
              bonuses: "0.00",
              clicks: 0,
              commission: "0.00",
              cpa: "0.00",
              cpaCount: 0,
              deposits: "0.00",
              fees: "0.00",
              firstDeposits: 0,
              grossRevenue: "0.00",
              netRevenue: "0.00",
              registrations: 1,
              tags: [],
              tax: "0.00",
              taxRate: "0.00",
              turnover: "0.00",
            },
            {
              activityDate: '20191015',
              clicks: 1,
              registrations: 0,
              firstDeposits: 0,
              tags: [],
              deposits: '250.00',
              turnover: '350.00',
              grossRevenue: '65.00',
              bonuses: '25.00',
              adjustments: '30.00',
              fees: '2.50',
              tax: '2.50',
              taxRate: '0.00',
              netRevenue: '55.00',
              commission: '2.50',
              cpa: '25.00',
              cpaCount: 1,
            },
            {
              activityDate: '20191031',
              clicks: 1,
              registrations: 0,
              firstDeposits: 0,
              tags: [],
              deposits: '410.00',
              turnover: '510.00',
              grossRevenue: '81.00',
              bonuses: '41.00',
              adjustments: '46.00',
              fees: '4.10',
              tax: '4.10',
              taxRate: '0.00',
              netRevenue: '71.00',
              commission: '4.10',
              cpa: '41.00',
              cpaCount: 1,
            },
          ],
          totals: {
            clicks: 3,
            registrations: 1,
            firstDeposits: 1,
            fees: '7.70',
            tax: '7.70',
            netRevenue: '167.00',
            commission: '7.70',
            commissionAfterTax: '0.00',
            cpa: '77.00',
            cpaCount: 3,
            total: '84.70',
          },
        });
      })
      .expect(200);
  });

  it('can fail access api by closed affiliate', async () => {
    const affiliate: any = await affiliatesRepository.getAffiliate(pg, 3232323);
    await affiliatesRepository.updateAffiliate(pg, affiliate.id, (({ isClosed: true }): any));
    await request(app)
      .get(`/api/reports/0/combined/2019/10?token=${affiliate.apiToken}`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied. Invalid token.',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(401);
      await affiliatesRepository.updateAffiliate(pg, affiliate.id, (({ isClosed: false }): any));
  });

  it('can fail access api without token', async () => {
    await request(app)
      .get(`/api/reports/0/combined/2019/10`)
      .expect((res) => {
        expect(res.body).to.deep.equal({
          error: {
            message: 'Access denied. No token found.',
          },
        });
        expect(res.header['x-auth-token']).to.not.exist();
      })
      .expect(401);
  });
});
