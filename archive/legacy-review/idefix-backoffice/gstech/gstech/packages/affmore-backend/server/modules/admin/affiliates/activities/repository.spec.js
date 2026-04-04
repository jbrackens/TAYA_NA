/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Activities Repository', () => {
  it('can get affiliate activities for a period', async () => {
    const activities = await repository.getAffiliateActivities(
      pg,
      3232323,
      DateTime.utc(2019, 11, 1),
      DateTime.utc(2019, 12, 1),
    );

    expect(activities).to.deep.equal([
      {
        link: 'Beautiful name of the Link',
        linkId: 1,
        segment: 'dummy_segment',
        brandId: 'CJ',
        clicks: 3,
        nrc: 0,
        ndc: 0,
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        cpa: 7600,
      },
      {
        link: 'Beautiful name of the Link',
        linkId: 2,
        segment: 'dummy_segment',
        brandId: 'KK',
        clicks: 3,
        nrc: 0,
        ndc: 0,
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        cpa: 7600,
      },
      {
        link: 'Beautiful name of the Link',
        linkId: 3,
        segment: 'dummy_segment',
        brandId: 'LD',
        clicks: 3,
        nrc: 0,
        ndc: 0,
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        cpa: 7600,
      },
      {
        link: 'Beautiful name of the Link',
        linkId: 4,
        segment: 'dummy_segment',
        brandId: 'OS',
        clicks: 3,
        nrc: 0,
        ndc: 0,
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        cpa: 7600,
      },
    ]);
  });

  it('can get affiliate activities for a period filtered by brand', async () => {
    const activities = await repository.getAffiliateActivities(
      pg,
      3232323,
      DateTime.utc(2019, 11, 1),
      DateTime.utc(2019, 12, 1),
      'LD',
    );

    expect(activities).to.deep.equal([
      {
        link: 'Beautiful name of the Link',
        linkId: 3,
        brandId: 'LD',
        segment: 'dummy_segment',
        nrc: 0,
        ndc: 0,
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        cpa: 7600,
        clicks: 3,
      },
    ]);
  });
});
