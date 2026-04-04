/* @flow */
const { affmoreBrands } = require('../types/constants');
const dealsRepository = require('./modules/admin/affiliates/deals/repository');

const noLadderDealBrands: BrandId[] = ['FK', 'SN', 'VB'];

const getDefaultDeals = async (
  knex: Knex,
): Promise<{
  [BrandId]: {
    planId: Id,
    name: string,
    nrs: ?number,
    cpa: Money,
    createdBy: Id,
    createdAt: Date,
    updatedAt: Date,
  },
}> => {
  const defaultDeal = await dealsRepository.findDeal(knex, null, 0);
  const noLadderDefaultDeal = (await dealsRepository.findDeal(knex, 0, 0)) || defaultDeal;

  const deals = affmoreBrands.map(({ id }) => ({
    brandId: id,
    deal: noLadderDealBrands.includes(id) ? noLadderDefaultDeal : defaultDeal,
  }));
  const result = deals.reduce((obj, cur: any): any => ({ ...obj, [cur.brandId]: cur.deal }), {});

  return result;
};

module.exports = {
  getDefaultDeals,
};
