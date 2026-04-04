// @flow
import type { DealDraft, Deal, DealWithDetails } from '../../../../../types/repository/deals';

const { DateTime } = require('luxon');
const { upsert2 } = require('gstech-core/modules/knex');

const createDeal = async (knex: Knex, dealDraft: DealDraft, userId: Id): Promise<Deal> => {
  const now = DateTime.utc();
  const [deal] = await knex('deals')
    .insert({ ...dealDraft, createdBy: userId, createdAt: now, updatedAt: now })
    .returning('*');

  return deal;
};

const getAffiliateDeals = async (knex: Knex, affiliateId: Id): Promise<DealWithDetails[]> => {
  const deals = await knex('deals')
    .select('deals.id', 'deals.planId', 'deals.affiliateId', 'deals.brandId', 'deals.createdBy', 'deals.createdAt', 'deals.updatedAt', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa')
    .leftJoin('plans', 'plans.id', 'deals.planId')
    .where({ 'deals.affiliateId': affiliateId })
    .orderBy('deals.brandId');

  return deals;
};

const findDeal = async (knex: Knex, nrs: ?number, cpa: number): Promise<{ planId: Id, name: string, nrs: ?number, cpa: Money, createdBy: Id, createdAt: Date, updatedAt: Date }> => {
  const deal = await knex('plans')
    .select('plans.id as planId', 'plans.name', knex.raw('plans.nrs::REAL'), 'plans.cpa', 'plans.createdBy', 'plans.createdAt', 'plans.updatedAt')
    .where({ nrs, cpa })
    .whereNotExists(knex.select('rules.id')
      .from('rules')
      .whereRaw('rules."planId" = plans.id'))
    .orderBy('plans.id')
    .first();

  return deal;
};

const upsertDeal = async (knex: Knex, dealDraft: DealDraft, userId: Id): Promise<Deal> => {
  const now = DateTime.utc();
  const deal = await upsert2(
    knex,
    'deals',
    { ...dealDraft, createdBy: userId, createdAt: now, updatedAt: now },
    ['affiliateId', 'brandId'],
    ['createdAt'],
  );

  return deal;
};

const updateDeal = async (knex: Knex, dealId: Id, dealDraft: DealDraft): Promise<Deal> => {
  const now = DateTime.utc();
  const [deal] = await knex('deals')
    .update({ ...dealDraft, updatedAt: now })
    .where({ id: dealId })
    .returning('*');

  return deal;
};

const deleteDeal = async (knex: Knex, affiliateId: Id, brandId: BrandId): Promise<number> => {
  const count = await knex('deals')
    .delete()
    .where({ affiliateId, brandId });

  return count;
};

module.exports = {
  createDeal,
  getAffiliateDeals,
  findDeal,
  upsertDeal,
  updateDeal,
  deleteDeal,
};
