/* @flow */
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Sub Affiliates Repository', () => {
  it('can create sub affiliate', async () => {
    const subAffiliateDraft = {
      parentId: 3232323,
      affiliateId: 100001,
      commissionShare: 20,
    };

    const subAffiliate = await repository.createSubAffiliate(pg, subAffiliateDraft);
    expect(subAffiliate).to.deep.equal({
      id: subAffiliate.id,
      ...subAffiliateDraft,
    });
  });

  it('can update sub affiliate', async () => {
    const subAffiliateDraft = {
      parentId: 3232323,
      affiliateId: 100001,
      commissionShare: 25,
    };

    const subAffiliate = await repository.updateSubAffiliate(pg, subAffiliateDraft);
    expect(subAffiliate).to.deep.equal({
      id: subAffiliate.id,
      ...subAffiliateDraft,
    });
  });

  it('can delete sub affiliate', async () => {
    const count = await repository.deleteSubAffiliate(pg, 3232323, 100001);
    expect(count).to.be.equal(1);
  });
});
