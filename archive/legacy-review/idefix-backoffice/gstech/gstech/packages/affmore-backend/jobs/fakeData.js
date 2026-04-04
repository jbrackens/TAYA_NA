/* eslint-disable ft-flow/require-valid-file-annotation */
/* eslint-disable max-len */
/* eslint-disable no-plusplus */
/* eslint-disable no-console */
require('flow-remove-types/register');

const { DateTime, Interval } = require('luxon');
const { v1: uuid } = require('uuid');

const pg = require('gstech-core/modules/pg');
const { serializeDateRange } = require('gstech-core/modules/knex');
// const { createAdminFee, createAdminFeeRule } = require('../server/modules/admin/fees/repository');

const truncateTables = async () => {
  console.log('+++ AFF truncateTables');
  await pg.raw(`TRUNCATE admin_fees RESTART IDENTITY CASCADE;`);
  await pg('callback_logs').delete();
  await pg('callbacks').delete();
  await pg('landings').delete();
  await pg('payments').delete();
  await pg('invoices').delete();
  await pg('activities').delete();
  await pg('players').delete();
  await pg('rules').delete();
  await pg.raw(`TRUNCATE clicks RESTART IDENTITY CASCADE;`);
  await pg('links').delete();
  await pg('deals').delete();
  await pg('plans').delete();
  await pg('logs').delete();
  await pg('sub_affiliates').delete();
  await pg('affiliates').delete();
  await pg('admin_fees').delete();
  await pg('admin_fee_rules').delete();
  await pg('admin_fee_affiliates').delete();
};

const updateSequence = async () => {
  console.log('+++ AFF updateSequence');
  await pg.raw('SELECT setval(\'landings_id_seq\', (SELECT MAX(id) from "landings"));');
  await pg.raw('SELECT setval(\'payments_id_seq\', (SELECT MAX(id) from "payments"));');
  await pg.raw('SELECT setval(\'activities_id_seq\', (SELECT MAX(id) from "activities"));');
  await pg.raw('SELECT setval(\'players_id_seq\', (SELECT MAX(id) from "players"));');
  await pg.raw('SELECT setval(\'rules_id_seq\', (SELECT MAX(id) from "rules"));');
  // await pg.raw('SELECT setval(\'clicks_id_seq\', (SELECT MAX(id) from "clicks"));');
  await pg.raw('SELECT setval(\'links_id_seq\', (SELECT MAX(id) from "links"));');
  await pg.raw('SELECT setval(\'deals_id_seq\', (SELECT MAX(id) from "deals"));');
  await pg.raw('SELECT setval(\'plans_id_seq\', (SELECT MAX(id) from "plans"));');
  await pg.raw('SELECT setval(\'logs_id_seq\', (SELECT MAX(id) from "logs"));');
  await pg.raw('SELECT setval(\'sub_affiliates_id_seq\', (SELECT MAX(id) from "sub_affiliates"));');
  await pg.raw('SELECT setval(\'affiliates_id_seq\', (SELECT MAX(id) from "affiliates"));');
  await pg.raw('SELECT setval(\'users_id_seq\', (SELECT MAX(id) from "users"));');
  await pg.raw('SELECT setval(\'callbacks_id_seq\', (SELECT MAX(id) from "callbacks"));');
  await pg.raw('SELECT setval(\'admin_fees_id_seq\', (SELECT MAX(id) from "admin_fees"));');
  await pg.raw('SELECT setval(\'admin_fee_rules_id_seq\', (SELECT MAX(id) from "admin_fee_rules"));');
  await pg.raw('SELECT setval(\'admin_fee_affiliates_id_seq\', (SELECT MAX(id) from "admin_fee_affiliates"));');
};

const affiliates = [{
  id: 3232323,
  hash: 'a1c0ae36c03adc0d01685b8f1bb35a283927f5091d114ddc47d238973892339a7407cb5b55b609b5126db5dad0d07c0f45430f836a20bb1f97e8adb13e1cee51dc5b1615d6761e8db44df018bca019ab86e44043af227abed9c740859ba4bf85bb1e6edb9539ca12c6a0d2db9e1e9c564192bb1e2b682c4e45a0430f88159dbcf1359815d188d544f6e429366856d1ff295fae3bdced251a8eac57d8afa1cd7cdd8bf87bfc2f55e18df42ca02f3a131563576181c92be8d7148fb4d7c49fe81e00a4995582afde3e8ea2ded26cd7c236cf61c56ef4e939811f932012ea034c3a1fc10fd055b16e8d0c16d00931469da7e31a0d03a4140872fcd91ee74cfd10a2bda16f83f61af34dddf156dad1a0d86b92387abdc48e79164ed356900f805c9312881aa9e4eae0c970090c34974ad85852cec79c15a34cbdf27850f6de6c2545768e6c11179c73050dc3d839621769c1b69c25121606aa129c040369e9bfaebd18316869bab18df3c2d23d3b37bbc8475ba7de46271633381d40e8e7f2c37a6572798188ac75f764c14f7ca4afcfaa942d8e22e1908dc5033691d8327df0ec7c3770108803705e26b5df87c4de7544c69000fee25f67ebcc10de5d5e999e12c5200183330fa2e0b72159798751d030dcf321318ec4afa5782e65064c15dbfe48b7ad52dad6e92354c9987c9782e86c1bb35805b07d01eee48487aa1824c366e9',
  salt: 'b3dfec19b5d441fa5d380d702044117bf35121b6',
  name: 'Giant Affiliate',
  contactName: 'Elliot Alderson',
  email: 'elliot@gmail.com',
  countryId: 'FI',
  address: 'Robinsoni 25',
  phone: null,
  skype: null,
  vatNumber: null,
  info: null,
  allowEmails: true,
  paymentMinAmount: 20000,
  paymentMethod: 'casinoaccount',
  paymentMethodDetails: { casinoAccountEmail: 'elliot@gmail.com' },
  floorBrandCommission: false,
  allowNegativeFee: true,
  allowPayments: false,
  isInternal: false,
  userId: 0,
  createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  lastLoginDate: DateTime.utc(2019, 11, 11, 18, 15, 30),
}, {
  id: 5454545,
  hash: 'a1c0ae36c03adc0d01685b8f1bb35a283927f5091d114ddc47d238973892339a7407cb5b55b609b5126db5dad0d07c0f45430f836a20bb1f97e8adb13e1cee51dc5b1615d6761e8db44df018bca019ab86e44043af227abed9c740859ba4bf85bb1e6edb9539ca12c6a0d2db9e1e9c564192bb1e2b682c4e45a0430f88159dbcf1359815d188d544f6e429366856d1ff295fae3bdced251a8eac57d8afa1cd7cdd8bf87bfc2f55e18df42ca02f3a131563576181c92be8d7148fb4d7c49fe81e00a4995582afde3e8ea2ded26cd7c236cf61c56ef4e939811f932012ea034c3a1fc10fd055b16e8d0c16d00931469da7e31a0d03a4140872fcd91ee74cfd10a2bda16f83f61af34dddf156dad1a0d86b92387abdc48e79164ed356900f805c9312881aa9e4eae0c970090c34974ad85852cec79c15a34cbdf27850f6de6c2545768e6c11179c73050dc3d839621769c1b69c25121606aa129c040369e9bfaebd18316869bab18df3c2d23d3b37bbc8475ba7de46271633381d40e8e7f2c37a6572798188ac75f764c14f7ca4afcfaa942d8e22e1908dc5033691d8327df0ec7c3770108803705e26b5df87c4de7544c69000fee25f67ebcc10de5d5e999e12c5200183330fa2e0b72159798751d030dcf321318ec4afa5782e65064c15dbfe48b7ad52dad6e92354c9987c9782e86c1bb35805b07d01eee48487aa1824c366e9',
  salt: 'b3dfec19b5d441fa5d380d702044117bf35121b6',
  name: 'Mega Affiliate',
  contactName: 'Johnny Bravo',
  email: 'bravo@gmail.com',
  countryId: 'EE',
  address: 'Robinsoni 25',
  phone: '37256459863',
  skype: 'johnny.bravo',
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
  userId: 0,

  createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30),
  lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30),
}, {
  id: 7676767,
  hash: 'a1c0ae36c03adc0d01685b8f1bb35a283927f5091d114ddc47d238973892339a7407cb5b55b609b5126db5dad0d07c0f45430f836a20bb1f97e8adb13e1cee51dc5b1615d6761e8db44df018bca019ab86e44043af227abed9c740859ba4bf85bb1e6edb9539ca12c6a0d2db9e1e9c564192bb1e2b682c4e45a0430f88159dbcf1359815d188d544f6e429366856d1ff295fae3bdced251a8eac57d8afa1cd7cdd8bf87bfc2f55e18df42ca02f3a131563576181c92be8d7148fb4d7c49fe81e00a4995582afde3e8ea2ded26cd7c236cf61c56ef4e939811f932012ea034c3a1fc10fd055b16e8d0c16d00931469da7e31a0d03a4140872fcd91ee74cfd10a2bda16f83f61af34dddf156dad1a0d86b92387abdc48e79164ed356900f805c9312881aa9e4eae0c970090c34974ad85852cec79c15a34cbdf27850f6de6c2545768e6c11179c73050dc3d839621769c1b69c25121606aa129c040369e9bfaebd18316869bab18df3c2d23d3b37bbc8475ba7de46271633381d40e8e7f2c37a6572798188ac75f764c14f7ca4afcfaa942d8e22e1908dc5033691d8327df0ec7c3770108803705e26b5df87c4de7544c69000fee25f67ebcc10de5d5e999e12c5200183330fa2e0b72159798751d030dcf321318ec4afa5782e65064c15dbfe48b7ad52dad6e92354c9987c9782e86c1bb35805b07d01eee48487aa1824c366e9',
  salt: 'b3dfec19b5d441fa5d380d702044117bf35121b6',
  name: 'Super Affiliate',
  contactName: 'John Snow',
  email: 'snow@gmail.com',
  countryId: 'MT',
  address: 'Robinsoni 25',
  phone: '37256359863',
  skype: 'john.show',
  vatNumber: '564626548',
  info: 'Some meaningful information',
  allowEmails: true,
  paymentMinAmount: 20000,
  paymentMethod: 'banktransfer',
  paymentMethodDetails: { bankPostCode: '32131', bankCountry: 'UK', bankClearingNumber: '', bankBic: 'JKCHKJDH', bankIban: '55-2543', bankAddress: '', bankName: 'Citibank', bankAccountHolder: 'John Snow' },
  floorBrandCommission: false,
  allowNegativeFee: true,
  allowPayments: false,
  isInternal: false,
  userId: 0,
  createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  lastLoginDate: null,
}, {
  id: 9292929,
  hash: 'a1c0ae36c03adc0d01685b8f1bb35a283927f5091d114ddc47d238973892339a7407cb5b55b609b5126db5dad0d07c0f45430f836a20bb1f97e8adb13e1cee51dc5b1615d6761e8db44df018bca019ab86e44043af227abed9c740859ba4bf85bb1e6edb9539ca12c6a0d2db9e1e9c564192bb1e2b682c4e45a0430f88159dbcf1359815d188d544f6e429366856d1ff295fae3bdced251a8eac57d8afa1cd7cdd8bf87bfc2f55e18df42ca02f3a131563576181c92be8d7148fb4d7c49fe81e00a4995582afde3e8ea2ded26cd7c236cf61c56ef4e939811f932012ea034c3a1fc10fd055b16e8d0c16d00931469da7e31a0d03a4140872fcd91ee74cfd10a2bda16f83f61af34dddf156dad1a0d86b92387abdc48e79164ed356900f805c9312881aa9e4eae0c970090c34974ad85852cec79c15a34cbdf27850f6de6c2545768e6c11179c73050dc3d839621769c1b69c25121606aa129c040369e9bfaebd18316869bab18df3c2d23d3b37bbc8475ba7de46271633381d40e8e7f2c37a6572798188ac75f764c14f7ca4afcfaa942d8e22e1908dc5033691d8327df0ec7c3770108803705e26b5df87c4de7544c69000fee25f67ebcc10de5d5e999e12c5200183330fa2e0b72159798751d030dcf321318ec4afa5782e65064c15dbfe48b7ad52dad6e92354c9987c9782e86c1bb35805b07d01eee48487aa1824c366e9',
  salt: 'b3dfec19b5d441fa5d380d702044117bf35121b6',
  name: 'New Affiliate',
  contactName: 'Jack Sparrow',
  email: 'jack.sparrow@gmail.com',
  countryId: 'MT',
  address: 'Robinsoni 25',
  phone: '37256359863',
  vatNumber: '564626548',
  info: 'Some meaningful information',
  allowEmails: true,
  paymentMinAmount: 20000,
  paymentMethod: 'casinoaccount',
  paymentMethodDetails: { casinoAccountEmail: 'jack.sparrow@gmail.com' },
  floorBrandCommission: false,
  allowNegativeFee: true,
  allowPayments: true,
  isInternal: false,
  userId: 1,
  createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
  lastLoginDate: null,
}];

const plans = [{
  id: 1,
  name: 'FI: deposit: €100 cpa: €25',
  nrs: null,
  cpa: 0,
  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30),
}, {
  id: 2,
  name: 'Global: 0% / FI: deposit: €100 cpa: €25',
  nrs: 0,
  cpa: 1000,
  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 12, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 12, 18, 15, 30),
}, {
  id: 3,
  name: 'Global: 45% / FI: deposit: €100 cpa: €25',
  nrs: 45,
  cpa: 1000,
  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 13, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 13, 18, 15, 30),
}, {
  id: 4,
  name: 'Global: 50% / FI: deposit: €100 cpa: €25',
  nrs: 50.5,
  cpa: 0,
  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 500,
  name: 'Zero Plan',
  nrs: 0,
  cpa: 0,
  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}];

const landings = [{
  id: 1,
  brandId: 'CJ',
  landingPage: 'https://beta.casinojefe.com/en',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 2,
  brandId: 'KK',
  landingPage: 'https://beta.kalevalakasino.com/en',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 3,
  brandId: 'LD',
  landingPage: 'https://beta.luckydino.com/en',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 4,
  brandId: 'OS',
  landingPage: 'https://beta.olaspill.com/en',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 5,
  brandId: 'CJ',
  landingPage: 'https://beta.casinojefe.com/custom',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 6,
  brandId: 'KK',
  landingPage: 'https://beta.kalevalakasino.com/custom',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 7,
  brandId: 'LD',
  landingPage: 'https://beta.luckydino.com/custom',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}, {
  id: 8,
  brandId: 'OS',
  landingPage: 'https://beta.olaspill.com/custom',

  createdBy: 0,
  createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
}];

const callbacks = [
  {
    id: 1,
    affiliateId: 3232323,
    linkId: null,
    brandId: 'LD',
    method: 'POST',
    trigger: 'NRC',
    url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
    enabled: true,

    createdBy: 0,
    createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
    updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  },
  {
    id: 2,
    affiliateId: 3232323,
    linkId: null,
    brandId: 'LD',
    method: 'POST',
    trigger: 'NDC',
    url: 'http://localhost/webhook?rid={rid}&uid={uid}&segment={segment}',
    enabled: true,

    createdBy: 0,
    createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
    updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  },
  {
    id: 3,
    affiliateId: 5454545,
    linkId: 5,
    brandId: 'CJ',
    method: 'GET',
    trigger: 'NDC',
    url: 'http://localhost/webhook?rid={rid}&uid={uid}&linkid={linkid}&segment={segment}',
    enabled: true,

    createdBy: 0,
    createdAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
    updatedAt: DateTime.utc(2019, 10, 14, 18, 15, 30),
  },
];

const adminFees = [
  {
    id: 1,
    name: 'fee-1',
    percent: 10,
    active: true,
    createdBy: 0,
    createdAt: DateTime.utc().minus({ months: 5 }),
    draft: {
      id: 11,
      percent: 11,
      name: 'fee-1',
      active: false,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 2,
    name: 'fee-2',
    percent: 20,
    active: true,
    createdBy: 0,
    createdAt: DateTime.utc().minus({ months: 4 }),
    draft: {
      id: 12,
      percent: 21,
      name: 'fee-2.1',
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 3,
    name: 'fee-3',
    percent: 30,
    active: true,
    createdBy: 0,
    createdAt: DateTime.utc().minus({ months: 3 }),
    draft: {
      id: 13,
      percent: 31,
      name: 'fee-3',
      active: false,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 4,
    name: 'fee-4',
    percent: 40,
    active: true,
    createdBy: 0,
    createdAt: DateTime.utc().minus({ months: 2 }),
    draft: {
      id: 14,
      percent: 41,
      name: 'fee-4.1',
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 5,
    name: 'fee-5',
    percent: 50,
    active: true,
    createdBy: 0,
    createdAt: DateTime.utc().minus({ months: 1 }),
    draft: {
      id: 15,
      removedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
];

const adminFeeRules = [
  {
    id: 1,
    adminFeeId: 1,
    percent: 12,
    countryId: 'FI',
    createdAt: DateTime.utc().minus({ months: 5 }),
    draft: {
      id: 11,
      percent: 21,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 2,
    adminFeeId: 1,
    percent: 13,
    countryId: 'MT',
    createdAt: DateTime.utc().minus({ months: 5 }),
    draft: {
      id: 12,
      percent: 31,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 3,
    adminFeeId: 1,
    percent: 15,
    countryId: 'US',
    createdAt: DateTime.utc().minus({ months: 3 }),
    draft: {
      id: 13,
    },
  },
  {
    id: 8,
    adminFeeId: 1,
    percent: 1,
    countryId: 'BR',
    createdAt: DateTime.utc().minus({ months: 1 }),
    draft: {
      id: 18,
    },
  },
  {
    id: 4,
    adminFeeId: 2,
    percent: 22,
    countryId: 'FI',
    createdAt: DateTime.utc().minus({ months: 4 }),
    draft: {
      id: 14,
      removedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 5,
    adminFeeId: 3,
    percent: 33,
    countryId: 'MT',
    createdAt: DateTime.utc().minus({ months: 3 }),
    draft: {
      id: 15,
      removedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 6,
    adminFeeId: 4,
    percent: 43,
    countryId: 'MT',
    createdAt: DateTime.utc().minus({ months: 2 }),
    draft: {
      id: 16,
      percent: 34,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
  {
    id: 7,
    adminFeeId: 4,
    percent: 45,
    countryId: 'US',
    createdAt: DateTime.utc().minus({ months: 2 }),
    draft: {
      id: 17,
      percent: 54,
      updatedAt: DateTime.utc().startOf('month').plus({ days: 1 }),
    },
  },
];

const mkPeriod = (offset, length) => {
  const ref = DateTime.utc(DateTime.local().year, DateTime.local().month, 1);
  const start = ref.plus({ month: offset }).startOf('month');
  const end = start.plus({ month: length }).startOf('month');
  return serializeDateRange(Interval.fromDateTimes(start, end));
};

const adminFeeAffiliates = [
  {
    id: 1,
    affiliateId: 3232323,
    adminFeeId: 1,
    brandId: 'LD',
    period: mkPeriod(0, 2),
    createdBy: 0,
  },
  {
    id: 11,
    affiliateId: 3232323,
    adminFeeId: 1,
    brandId: 'LD',
    period: mkPeriod(2, 1),
    createdBy: 0,
  },
  {
    id: 2,
    affiliateId: 3232323,
    adminFeeId: 2,
    brandId: 'CJ',
    period: mkPeriod(-3, 1),
    createdBy: 0,
  },
  {
    id: 12,
    affiliateId: 3232323,
    adminFeeId: 1,
    brandId: 'CJ',
    period: mkPeriod(-1, 3),
    createdBy: 0,
  },
  {
    id: 3,
    affiliateId: 3232323,
    adminFeeId: 3,
    brandId: 'OS',
    period: mkPeriod(-2, 4),
    createdBy: 0,
  },
  {
    id: 4,
    affiliateId: 3232323,
    adminFeeId: 2,
    brandId: 'KK',
    period: mkPeriod(-2, 4),
    createdBy: 0,
  },
  {
    id: 5,
    affiliateId: 3232323,
    adminFeeId: 3,
    brandId: 'FK',
    period: mkPeriod(-2, 5),
    createdBy: 0,
  },
  {
    id: 6,
    affiliateId: 3232323,
    adminFeeId: 4,
    brandId: 'SN',
    period: mkPeriod(-1, 4),
    createdBy: 0,
  },
  {
    id: 7,
    affiliateId: 3232323,
    adminFeeId: 5,
    brandId: 'VB',
    period: mkPeriod(0, 2),
    createdBy: 0,
  },
  {
    id: 8,
    affiliateId: 9292929,
    adminFeeId: 5,
    brandId: 'LD',
    period: mkPeriod(5, 1),
    createdBy: 0,
  },
  {
    id: 9,
    affiliateId: 9292929,
    adminFeeId: 1,
    brandId: 'CJ',
    period: mkPeriod(1, 1),
    createdBy: 0,
  },
  {
    id: 10,
    affiliateId: 7676767,
    adminFeeId: 2,
    brandId: 'CJ',
    period: mkPeriod(1, 1),
    createdBy: 0,
  },
];

const createFakeData = async () => {
  console.log('+++ AFF createFakeData');
  let ruleCounter = 1;
  let dealCounter = 1;
  let paymentCounter = 1;
  let logCounter = 1;
  let linkCounter = 1;
  let playerCounter = 354732;
  let activitiesCounter = 1;

  for (const p of plans) {
    const [plan] = await pg('plans').insert(p).returning('*');
    for (const countryId of ['FI', 'DE', 'SE']) {
      if (p.id === 500) break;

      const isEven = ruleCounter % 2 === 0;
      await pg('rules').insert({
        id: ruleCounter++,
        planId: plan.id,
        countryId,
        nrs: isEven ? 30 : 25,
        cpa: isEven ? 2000 : 1000,
        deposit: isEven ? 10000 : 15000,
        deposit_cpa: isEven ? 2500 : 3000,
      });
    }
  }
  await pg('plans')
    .insert({
      id: 5,
      name: 'Default Plan',
      nrs: null,
      cpa: 0,
      createdBy: 0,
      createdAt: DateTime.utc(2019, 10, 11, 18, 15, 30),
      updatedAt: DateTime.utc(2019, 10, 11, 18, 15, 30),
    })
    .returning('*');

  for (const l of landings) {
    await pg('landings').insert(l);
  }

  for (const a of affiliates) {
    const [affiliate] = await pg('affiliates').insert(a).returning('*');

    let planId = 1;
    let brands;
    if (affiliate.id === 3232323) brands = ['CJ', 'KK', 'LD', 'OS'];
    if (affiliate.id === 5454545) brands = ['CJ', 'KK'];
    if (affiliate.id === 7676767) brands = ['LD'];
    if (affiliate.id === 9292929) brands = ['LD'];

    if (affiliate.id !== 9292929) {
      for (const brandId of brands) {
        await pg('deals').insert({
          id: dealCounter++,
          affiliateId: affiliate.id,
          planId,
          brandId,
          createdBy: 0,
          createdAt: DateTime.utc(2019, 10, planId, 18, 15, 30),
          updatedAt: DateTime.utc(2019, 10, planId, 18, 15, 30),
        });
        planId++;
      }
    }

    if (affiliate.id !== 9292929) {
      for (const day of [1, 10, 17, 27]) {
        await pg('payments').insert({
          id: paymentCounter,
          affiliateId: affiliate.id,
          transactionId: `Transaction ${paymentCounter}`,
          transactionDate: DateTime.utc(2019, 11, day, 18, 15, 30).toJSDate(),
          month: 11,
          year: 2019,
          type: 'Manual',
          description: 'transaction description',
          amount: 100000 + 10000 * day,
          createdBy: 0,
        });
        paymentCounter++;
      }
    }

    for (const day of [1, 15, 25]) {
      await pg('logs').insert({
        id: logCounter,
        affiliateId: affiliate.id,
        note: 'One beautiful note',

        createdBy: 0,
        createdAt: DateTime.utc(2019, 10, day, 18, 15, 30),
        updatedAt: DateTime.utc(2019, 10, day, 18, 15, 30),
      });
      logCounter++;
    }

    const links = [];
    const clicks = [];
    if (affiliate.id !== 9292929) {
      for (const brandId of ['CJ', 'KK', 'LD', 'OS']) {
        const [link] = await pg('links')
          .insert({
            id: linkCounter++,
            affiliateId: affiliate.id,
            brandId,
            code: uuid(),
            name: 'Beautiful name of the Link',
            landingPage: 'https://beta.luckydino.com/en',
          })
          .returning('*');
        links.push(link);

        for (const date of [
          [10, 1],
          [10, 15],
          [10, 31],
          [11, 1],
          [11, 15],
          [11, 30],
        ]) {
          const [click] = await pg('clicks')
            .insert({
              linkId: links.find((l) => l.brandId === brandId).id,
              clickDate: DateTime.utc(2019, date[0], date[1], 18, 15, 30).toJSDate(),
              referralId: 'sampleRetardId',
              queryParameters: {},
              segment: 'dummy_segment',
              ipAddress: '127.0.0.1',
              userAgent: 'UA',
              referer: 'https://google.com',
            })
            .returning('*');

          clicks.push(click.id);
        }
      }
    }

    planId = 1;
    if (affiliate.id !== 9292929) {
      for (const [brandId, countryId] of [
        ['CJ', 'CA'],
        ['KK', 'FI'],
        ['LD', 'DE'],
        ['OS', 'NO'],
      ]) {
        const [player] = await pg('players')
          .insert({
            id: playerCounter++,
            affiliateId: affiliate.id,
            planId,
            linkId: links.find((l) => l.brandId === brandId).id,
            clickId: clicks.pop(),
            brandId,
            countryId,
            registrationDate: DateTime.utc(2019, 10, planId++),
          })
          .returning('*');

        for (const date of [
          [10, 1],
          [10, 15],
          [10, 31],
          [11, 1],
          [11, 15],
          [11, 30],
        ]) {
          await pg('activities').insert({
            id: activitiesCounter++,
            playerId: player.id,
            activityDate: DateTime.utc(2019, date[0], date[1]),
            deposits: 10000 + 1000 * date[1],
            turnover: 20000 + 1000 * date[1],
            grossRevenue: 5000 + 100 * date[1],
            bonuses: 1000 + 100 * date[1],
            adjustments: 1500 + 100 * date[1],
            fees: 100 + 10 * date[1],
            tax: 100 + 10 * date[1],
            netRevenue: 4000 + 100 * date[1],
            commission: 100 + 10 * date[1],
            cpa: 1000 + 100 * date[1],
          });
        }
      }
    }
  }

  for (const cb of callbacks) {
    await pg('callbacks').insert(cb);
  }

  for (const { draft, id, ...fee } of adminFees) {
    await pg('admin_fees').insert({ id, ...fee });
    await pg('admin_fees').insert({ ...fee, ...draft, draftId: id });
  }
  for (const { draft, id, ...rule } of adminFeeRules) {
    await pg('admin_fee_rules').insert({ id, ...rule });
    await pg('admin_fee_rules').insert({ ...rule, ...draft, draftId: id });
  }
  await pg('admin_fee_affiliates').insert(adminFeeAffiliates);
};


const createRandomFakeData = async () => {
  console.log('+++ AFF createRandomFakeData');
  for (let i = 100000; i < 100020; i++) {
    const [affiliate] = await pg('affiliates')
      .insert({
        id: i,
        hash: 'a1c0ae36c03adc0d01685b8f1bb35a283927f5091d114ddc47d238973892339a7407cb5b55b609b5126db5dad0d07c0f45430f836a20bb1f97e8adb13e1cee51dc5b1615d6761e8db44df018bca019ab86e44043af227abed9c740859ba4bf85bb1e6edb9539ca12c6a0d2db9e1e9c564192bb1e2b682c4e45a0430f88159dbcf1359815d188d544f6e429366856d1ff295fae3bdced251a8eac57d8afa1cd7cdd8bf87bfc2f55e18df42ca02f3a131563576181c92be8d7148fb4d7c49fe81e00a4995582afde3e8ea2ded26cd7c236cf61c56ef4e939811f932012ea034c3a1fc10fd055b16e8d0c16d00931469da7e31a0d03a4140872fcd91ee74cfd10a2bda16f83f61af34dddf156dad1a0d86b92387abdc48e79164ed356900f805c9312881aa9e4eae0c970090c34974ad85852cec79c15a34cbdf27850f6de6c2545768e6c11179c73050dc3d839621769c1b69c25121606aa129c040369e9bfaebd18316869bab18df3c2d23d3b37bbc8475ba7de46271633381d40e8e7f2c37a6572798188ac75f764c14f7ca4afcfaa942d8e22e1908dc5033691d8327df0ec7c3770108803705e26b5df87c4de7544c69000fee25f67ebcc10de5d5e999e12c5200183330fa2e0b72159798751d030dcf321318ec4afa5782e65064c15dbfe48b7ad52dad6e92354c9987c9782e86c1bb35805b07d01eee48487aa1824c366e9',
        salt: 'b3dfec19b5d441fa5d380d702044117bf35121b6',
        name: 'Random Affiliate',
        contactName: 'Random Contact Person',
        email: `some${i}@gmail.com`,
        countryId: 'FI',
        address: 'Robinsoni 25',
        allowEmails: true,
        paymentMinAmount: 20000,
        paymentMethod: 'casinoaccount',
        paymentMethodDetails: { casinoAccountEmail: 'some@gmail.com' },
        floorBrandCommission: true,
        allowNegativeFee: true,
        allowPayments: false,
        isInternal: false,
        userId: null,
        createdAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
        updatedAt: DateTime.utc(2019, 11, 1, 18, 15, 30),
        lastLoginDate: DateTime.utc(2019, 11, 11, 18, 15, 30),
      })
      .returning('*');

    if (i % 4 === 0) {
      await pg('sub_affiliates').insert({
        parentId: 3232323,
        affiliateId: affiliate.id,
        commissionShare: Math.round(10),
      });
    }

    for (let j = 0; j < 20; j++) {
      await pg('payments').insert({
        affiliateId: affiliate.id,
        transactionId: `Transaction ${uuid()}`,
        transactionDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
        month: 11,
        year: 2019,
        type: 'Manual',
        description: 'transaction description',
        amount: 100000,
        createdBy: 0,
      });
    }

    for (let j = 0; j < 20; j++) {
      await pg('logs').insert({
        affiliateId: affiliate.id,
        note: 'One beautiful note',
        createdBy: 0,
        createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30),
        updatedAt: DateTime.utc(2019, 10, 1, 18, 15, 30),
      });
    }

    const clicks = [];

    for (let j = 0; j < 30; j++) {
      const [link] = await pg('links')
        .insert({
          affiliateId: affiliate.id,
          brandId: 'LD',
          code: uuid(),
          name: 'Beautiful name of the Link',
          landingPage: 'https://beta.luckydino.com/en',
        })
        .returning('*');

      for (let k = 0; k < 20; k++) {
        const [click] = await pg('clicks')
          .insert({
            linkId: link.id,
            clickDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
            ipAddress: '127.0.0.1',
            userAgent: 'UA',
            referer: 'https://google.com',
          })
          .returning('*');

        clicks.push(click.id);
      }
    }

    for (let j = 0; j < 10; j++) {
      await pg('players')
        .insert({
          affiliateId: affiliate.id,
          planId: 2,
          linkId: 1,
          clickId: clicks.pop(),
          brandId: 'LD',
          countryId: 'EU',
          registrationDate: DateTime.utc(2019, 10, 1),
        })
        .returning('*');
    }
  }

  await pg('admin_fee_affiliates').insert({
    id: 13,
    affiliateId: 100001,
    adminFeeId: 1,
    brandId: 'LD',
    period: serializeDateRange(
      Interval.fromDateTimes(
        DateTime.utc(2019, 11, 1).startOf('month'),
        DateTime.utc(DateTime.local().year, DateTime.local().month, 1)
          .plus({ months: 1 })
          .startOf('month'),
      ),
    ),
    createdBy: 0,
  });
};

module.exports = async () => {
  await truncateTables();
  await createFakeData();
  await updateSequence();
  await createRandomFakeData(); //! DEBUG ONLY: for Wallaby performance
};
