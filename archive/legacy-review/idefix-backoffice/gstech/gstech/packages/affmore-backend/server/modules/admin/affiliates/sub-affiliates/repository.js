// @flow
import type { SubAffiliateDraft, SubAffiliate } from '../../../../../types/repository/affiliates';

const createSubAffiliate = async (knex: Knex, subAffiliateDraft: SubAffiliateDraft): Promise<SubAffiliate> => {
  const [affiliate] =  await knex('sub_affiliates')
    .insert(subAffiliateDraft)
    .returning('*');

  return affiliate;
};

const updateSubAffiliate = async (knex: Knex, subAffiliateDraft: SubAffiliateDraft): Promise<SubAffiliate> => {
  const [affiliate] =  await knex('sub_affiliates')
    .update(subAffiliateDraft)
    .where({ parentId: subAffiliateDraft.parentId, affiliateId: subAffiliateDraft.affiliateId })
    .returning('*');

  return affiliate;
};

const deleteSubAffiliate = async (knex: Knex, parentId: Id, affiliateId: Id): Promise<number> => {
  const count = await knex('sub_affiliates')
    .delete()
    .where({ parentId, affiliateId });

  return count;
};

module.exports = {
  createSubAffiliate,
  updateSubAffiliate,
  deleteSubAffiliate,
};
