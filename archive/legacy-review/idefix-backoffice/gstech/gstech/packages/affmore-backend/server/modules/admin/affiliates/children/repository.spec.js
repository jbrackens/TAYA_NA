/* @flow */
const _ = require('lodash');
const pg = require('gstech-core/modules/pg');
const repository = require('./repository');
const affiliatesRepository = require('../repository');

describe('Children Affiliates Repository', () => {
  const timeStamp = new Date().getTime();
  let childAffiliateId;
  it('can get children affiliates', async () => {
    const affiliateDraft = {
      hash: '90534859043845093',
      salt: '3485903485',

      name: 'Random Affiliate',
      contactName: 'Random Person',
      email: `random${timeStamp}@gmail.com`,
      countryId: 'FI',
      address: 'Robinsoni 25',
      phone: '37256459863',
      skype: 'random.random',
      vatNumber: '564646548',
      info: 'Some meaningful information',
      allowEmails: true,

      paymentMinAmount: 10000,
      paymentMethod: 'skrill',
      paymentMethodDetails: { skrillAccount: 'bravo@gmail.com' },

      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal: false,
      isClosed: false,
      userId: 1,
      masterId: 5454545,
      tcVersion: 0,
    };

    await affiliatesRepository.createAffiliate(pg, affiliateDraft);

    const affiliates = await repository.getChildrenAffiliates(pg, 5454545);
    const lastAffiliate = _.last(affiliates);
    childAffiliateId = lastAffiliate.id;

    expect(_.last(affiliates)).to.deep.equal({
      id: lastAffiliate.id,
      hash: '90534859043845093',
      salt: '3485903485',

      name: 'Random Affiliate',
      contactName: 'Random Person',
      email: `random${timeStamp}@gmail.com`,
      countryId: 'FI',
      address: 'Robinsoni 25',
      phone: '37256459863',
      skype: 'random.random',
      vatNumber: '564646548',
      info: 'Some meaningful information',
      allowEmails: true,

      paymentMinAmount: 10000,
      paymentMethod: 'skrill',
      paymentMethodDetails: { skrillAccount: 'bravo@gmail.com' },

      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal: false,
      isClosed: false,
      userId: 1,
      masterId: 5454545,
      tcVersion: 0,
      createdAt: lastAffiliate.createdAt,
      updatedAt: lastAffiliate.updatedAt,
      lastLoginDate: lastAffiliate.lastLoginDate,

      apiToken: null,
    });
  });

  it('can get child affiliate', async () => {
    const affiliate: any = await repository.getChildAffiliate(pg, 5454545, childAffiliateId);
    expect(affiliate).to.deep.equal({
      id: affiliate.id,
      hash: '90534859043845093',
      salt: '3485903485',

      name: 'Random Affiliate',
      contactName: 'Random Person',
      email: `random${timeStamp}@gmail.com`,
      countryId: 'FI',
      address: 'Robinsoni 25',
      phone: '37256459863',
      skype: 'random.random',
      vatNumber: '564646548',
      info: 'Some meaningful information',
      allowEmails: true,

      paymentMinAmount: 10000,
      paymentMethod: 'skrill',
      paymentMethodDetails: { skrillAccount: 'bravo@gmail.com' },

      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal: false,
      isClosed: false,
      userId: 1,
      masterId: 5454545,
      tcVersion: 0,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
      lastLoginDate: affiliate.lastLoginDate,

      apiToken: null,
    });
  });
});
