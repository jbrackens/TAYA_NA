/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Deals Repository', () => {
  let dealId;
  let createdAt;
  let updatedAt;
  it('can create deal', async () => {
    const deal = await repository.createDeal(pg, {
      affiliateId: 5454545,
      planId: 1,
      brandId: 'LD',
    }, 1);

    dealId = deal.id;
    createdAt = deal.createdAt;
    updatedAt = deal.updatedAt;

    expect(deal).to.deep.equal({
      id: dealId,
      affiliateId: 5454545,
      planId: 1,
      brandId: 'LD',
      createdBy: 1,
      createdAt,
      updatedAt,
    });
  });

  it('can get affiliate deals', async () => {
    const deals = await repository.getAffiliateDeals(pg, 5454545);
    expect(deals).to.deep.equal([{
      id: 5,
      affiliateId: 5454545,
      planId: 1,
      brandId: 'CJ',
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
    }, {
      id: 6,
      affiliateId: 5454545,
      planId: 2,
      brandId: 'KK',
      name: 'Global: 0% / FI: deposit: €100 cpa: €25',
      nrs: 0,
      cpa: 1000,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 2, 18, 15, 30).toJSDate(),
      updatedAt: DateTime.utc(2019, 10, 2, 18, 15, 30).toJSDate(),
    }, {
      id: dealId,
      affiliateId: 5454545,
      planId: 1,
      brandId: 'LD',
      name: 'FI: deposit: €100 cpa: €25',
      nrs: null,
      cpa: 0,
      createdBy: 1,
      createdAt,
      updatedAt,
    }]);
  });

  it('can upsert deal', async () => {
    const deal = await repository.upsertDeal(pg, ({
      affiliateId: 5454545,
      planId: 2,
      brandId: 'LD',
    }), 1);
    expect(deal).to.deep.equal({
      id: dealId,
      affiliateId: 5454545,
      planId: 2,
      brandId: 'LD',
      createdBy: 1,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    });
  });

  it('can update deal', async () => {
    const deal = await repository.updateDeal(pg, dealId, ({
      affiliateId: 5454545,
      planId: 2,
      brandId: 'LD',
    }));
    expect(deal).to.deep.equal({
      id: dealId,
      affiliateId: 5454545,
      planId: 2,
      brandId: 'LD',
      createdBy: 1,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    });
  });

  it('can delete deal', async () => {
    const count = await repository.deleteDeal(pg, 5454545, 'LD');
    expect(count).to.be.equal(1);

    const deals = await repository.getAffiliateDeals(pg, 5454545);
    expect(deals.length).to.be.equal(2);
  });
});
