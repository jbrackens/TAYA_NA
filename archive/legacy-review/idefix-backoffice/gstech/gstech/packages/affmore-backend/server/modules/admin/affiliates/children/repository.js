// @flow
import type { Affiliate } from '../../../../../types/repository/affiliates';

const getChildrenAffiliates = async (knex: Knex, masterAffiliateId: Id): Promise<Affiliate[]> => {
  const affiliates = await knex('affiliates')
    .select('id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion','createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .where({ masterId: masterAffiliateId })
    .orderBy('id')
    .returning('*');

  return affiliates;
};

const getChildAffiliate = async (knex: Knex, masterAffiliateId: Id, childAffiliateId: Id): Promise<?Affiliate> => {
  const [affiliate] = await knex('affiliates')
    .select('id', 'hash', 'salt', 'name', 'contactName', 'email', 'countryId', 'address', 'phone', 'skype', 'vatNumber', 'info', 'allowEmails', 'paymentMinAmount', 'paymentMethod', 'paymentMethodDetails', 'floorBrandCommission', 'allowNegativeFee', 'allowPayments', 'isInternal', 'isClosed', 'userId', 'masterId', 'tcVersion','createdAt', 'updatedAt', 'lastLoginDate', 'apiToken')
    .where({
      masterId: masterAffiliateId,
      id: childAffiliateId,
    })
    .orderBy('id')
    .returning('*');

  return affiliate;
};

module.exports = {
  getChildrenAffiliates,
  getChildAffiliate,
};
