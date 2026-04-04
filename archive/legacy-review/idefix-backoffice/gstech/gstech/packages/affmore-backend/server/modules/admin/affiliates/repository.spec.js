/* eslint-disable max-len */
/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Affiliates Repository', () => {
  let affiliateId;
  const timeStamp = new Date().getTime();
  it('can create affiliate', async () => {
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
      masterId: null,
      tcVersion: 0,
    };

    const affiliate = await repository.createAffiliate(pg, affiliateDraft);
    affiliateId = affiliate.id;
    expect(affiliate).to.deep.equal({
      masterId: null,
      id: affiliate.id,
      ...affiliateDraft,
      tcVersion: 0,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
      lastLoginDate: affiliate.lastLoginDate,
      apiToken: null,
    });
  });

  it('can update affiliate', async () => {
    const affiliateDraft = {
      name: 'Random Affiliate',
      contactName: 'Random Person 2',
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
      userId: 0,
      masterId: null,
    };

    const affiliate = await repository.updateAffiliate(pg, affiliateId, affiliateDraft);
    expect(affiliate).to.deep.equal({
      id: affiliate.id,
      masterId: null,
      hash: '90534859043845093',
      salt: '3485903485',
      ...affiliateDraft,
      tcVersion: 0,
      createdAt: affiliate.createdAt,
      updatedAt: affiliate.updatedAt,
      lastLoginDate: affiliate.lastLoginDate,
      apiToken: null,
    });

    await repository.updateAffiliate(pg, affiliateId, {
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
      userId: 0,
      masterId: null,
    });
  });

  it('can accept TC', async () => {
    let affiliate;
    affiliate = await repository.getAffiliate(pg, affiliateId);
    expect(affiliate && affiliate.tcVersion).to.be.equal(0);

    affiliate = await repository.acceptTC(pg, affiliateId, 1);
    expect(affiliate.tcVersion).to.be.equal(1);
  });

  it('can get affiliates', async () => {
    const affiliates = await repository.getAffiliates(pg);
    const affiliate = affiliates.find(a => a.id === 5454545);
    expect(affiliate).to.deep.equal({
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
      paymentMethodDetails: {
        skrillAccount: 'bravo@gmail.com',
      },

      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal: false,
      isClosed: false,
      userId: 0,
      masterId: null,
      tcVersion: 0,

      createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
      updatedAt: affiliate && affiliate.updatedAt,

      lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),

      apiToken: null,
    });
  });

  it('can get affiliate', async () => {
    const affiliate = await repository.getAffiliate(pg, 5454545);
    expect(affiliate).to.deep.equal({
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
      paymentMethodDetails: {
        skrillAccount: 'bravo@gmail.com',
      },
      accountBalance: 950000,

      floorBrandCommission: false,
      allowNegativeFee: false,
      allowPayments: false,
      isInternal: false,
      isClosed: false,
      userId: 0,
      masterId: null,
      tcVersion: 0,

      createdAt: DateTime.utc(2019, 10, 1, 18, 15, 30).toJSDate(),
      updatedAt: affiliate && affiliate.updatedAt,

      lastLoginDate: DateTime.utc(2019, 10, 11, 18, 15, 30).toJSDate(),

      apiToken: null,
    });
  });

  it('can get affiliate revenues', async () => {
    const players = await repository.getAffiliateRevenues(pg, 3232323);
    expect(players).to.deep.equal([
      {
        affiliateId: 3232323,
        playerId: 354732,
        planId: 1,
        countryId: 'CA',
        brandId: 'CJ',
        deal: 'FI: deposit: €100 cpa: €25',
        link: 'Beautiful name of the Link',
        clickDate: DateTime.utc(2019, 11, 30, 18, 15, 30).toJSDate(),
        referralId: 'sampleRetardId',
        segment: 'dummy_segment',
        registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
        deposits: 153000,
        turnover: 213000,
        grossRevenue: 39300,
        bonuses: 15300,
        adjustments: 18300,
        fees: 1530,
        tax: 1530,
        netRevenue: 33300,
        commission: 1530,
        commissions: {
          CJ: 1530,
          FK: 0,
          KK: 0,
          LD: 0,
          OS: 0,
          SN: 0,
          VB: 0,
        },
        cpa: 15300,
      },
      {
        affiliateId: 3232323,
        playerId: 354733,
        planId: 2,
        countryId: 'FI',
        brandId: 'KK',
        deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
        link: 'Beautiful name of the Link',
        clickDate: DateTime.utc(2019, 11, 15, 18, 15, 30).toJSDate(),
        referralId: 'sampleRetardId',
        segment: 'dummy_segment',
        registrationDate: DateTime.utc(2019, 10, 2).toJSDate(),
        deposits: 153000,
        turnover: 213000,
        grossRevenue: 39300,
        bonuses: 15300,
        adjustments: 18300,
        fees: 1530,
        tax: 1530,
        netRevenue: 33300,
        commission: 1530,
        commissions: {
          CJ: 0,
          FK: 0,
          KK: 1530,
          LD: 0,
          OS: 0,
          SN: 0,
          VB: 0,
        },
        cpa: 15300,
      },
      {
        affiliateId: 3232323,
        playerId: 354734,
        planId: 3,
        countryId: 'DE',
        brandId: 'LD',
        deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
        link: 'Beautiful name of the Link',
        clickDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
        referralId: 'sampleRetardId',
        segment: 'dummy_segment',
        registrationDate: DateTime.utc(2019, 10, 3).toJSDate(),
        deposits: 153000,
        turnover: 213000,
        grossRevenue: 39300,
        bonuses: 15300,
        adjustments: 18300,
        fees: 1530,
        tax: 1530,
        netRevenue: 33300,
        commission: 1530,
        commissions: {
          CJ: 0,
          FK: 0,
          KK: 0,
          LD: 1530,
          OS: 0,
          SN: 0,
          VB: 0,
        },
        cpa: 15300,
      },
      {
        affiliateId: 3232323,
        playerId: 354735,
        planId: 4,
        countryId: 'NO',
        brandId: 'OS',
        deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
        link: 'Beautiful name of the Link',
        clickDate: DateTime.utc(2019, 10, 31, 18, 15, 30).toJSDate(),
        referralId: 'sampleRetardId',
        segment: 'dummy_segment',
        registrationDate: DateTime.utc(2019, 10, 4).toJSDate(),
        deposits: 153000,
        turnover: 213000,
        grossRevenue: 39300,
        bonuses: 15300,
        adjustments: 18300,
        fees: 1530,
        tax: 1530,
        netRevenue: 33300,
        commission: 1530,
        commissions: {
          CJ: 0,
          FK: 0,
          KK: 0,
          LD: 0,
          OS: 1530,
          SN: 0,
          VB: 0,
        },
        cpa: 15300,
      },
    ]);
  });

  it('can get affiliate revenues for a month', async () => {
    const revenues = await repository.getAffiliateRevenues(pg, 3232323, 2019, 11);
    expect(revenues).to.deep.equal([{
      affiliateId: 3232323,
      playerId: 354732,
      planId: 1,
      countryId: 'CA',
      brandId: 'CJ',
      deal: 'FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
      clickDate: DateTime.utc(2019, 11, 30, 18, 15, 30).toJSDate(),
      referralId: 'sampleRetardId',
      segment: 'dummy_segment',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
      deposits: 76000,
      turnover: 106000,
      grossRevenue: 19600,
      bonuses: 7600,
      adjustments: 9100,
      fees: 760,
      tax: 760,
      netRevenue: 16600,
      commission: 760,
      commissions: {
        CJ: 760,
        FK: 0,
        KK: 0,
        LD: 0,
        OS: 0,
        SN: 0,
        VB: 0,
      },
      cpa: 7600,
    }, {
      affiliateId: 3232323,
      playerId: 354733,
      planId: 2,
      countryId: 'FI',
      brandId: 'KK',
      deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
      clickDate: DateTime.utc(2019, 11, 15, 18, 15, 30).toJSDate(),
      referralId: 'sampleRetardId',
      segment: 'dummy_segment',
      registrationDate: DateTime.utc(2019, 10, 2).toJSDate(),
      deposits: 76000,
      turnover: 106000,
      grossRevenue: 19600,
      bonuses: 7600,
      adjustments: 9100,
      fees: 760,
      tax: 760,
      netRevenue: 16600,
      commission: 760,
      commissions: {
        CJ: 0,
        FK: 0,
        KK: 760,
        LD: 0,
        OS: 0,
        SN: 0,
        VB: 0,
      },
      cpa: 7600,
    }, {
      affiliateId: 3232323,
      playerId: 354734,
      planId: 3,
      countryId: 'DE',
      brandId: 'LD',
      deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
      clickDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
      referralId: 'sampleRetardId',
      segment: 'dummy_segment',
      registrationDate: DateTime.utc(2019, 10, 3).toJSDate(),
      deposits: 76000,
      turnover: 106000,
      grossRevenue: 19600,
      bonuses: 7600,
      adjustments: 9100,
      fees: 760,
      tax: 760,
      netRevenue: 16600,
      commission: 760,
      commissions: {
        CJ: 0,
        FK: 0,
        KK: 0,
        LD: 760,
        OS: 0,
        SN: 0,
        VB: 0,
      },
      cpa: 7600,
    }, {
      affiliateId: 3232323,
      playerId: 354735,
      planId: 4,
      countryId: 'NO',
      brandId: 'OS',
      deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
      clickDate: DateTime.utc(2019, 10, 31, 18, 15, 30).toJSDate(),
      referralId: 'sampleRetardId',
      segment: 'dummy_segment',
      registrationDate: DateTime.utc(2019, 10, 4).toJSDate(),
      deposits: 76000,
      turnover: 106000,
      grossRevenue: 19600,
      bonuses: 7600,
      adjustments: 9100,
      fees: 760,
      tax: 760,
      netRevenue: 16600,
      commission: 760,
      commissions: {
        CJ: 0,
        FK: 0,
        KK: 0,
        LD: 0,
        OS: 760,
        SN: 0,
        VB: 0,
      },
      cpa: 7600,
    }]);
  });

  it('can get affiliate revenues for a month filtered by brand', async () => {
    const revenues = await repository.getAffiliateRevenues(pg, 3232323, 2019, 11, 'LD');
    expect(revenues).to.deep.equal([
      {
        affiliateId: 3232323,
        playerId: 354734,
        planId: 3,
        countryId: 'DE',
        brandId: 'LD',
        deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
        link: 'Beautiful name of the Link',
        clickDate: DateTime.utc(2019, 11, 1, 18, 15, 30).toJSDate(),
        referralId: 'sampleRetardId',
        segment: 'dummy_segment',
        registrationDate: DateTime.utc(2019, 10, 3, 0, 0, 0).toJSDate(),
        deposits: 76000,
        turnover: 106000,
        grossRevenue: 19600,
        bonuses: 7600,
        adjustments: 9100,
        fees: 760,
        tax: 760,
        netRevenue: 16600,
        commission: 760,
        commissions: {
          CJ: 0,
          FK: 0,
          KK: 0,
          LD: 760,
          OS: 0,
          SN: 0,
          VB: 0,
        },
        cpa: 7600,
      },
    ]);
  });


  it('can get affiliate activities', async () => {
    const activities = await repository.getAffiliateActivities(pg, 3232323, 2019, 10);

    expect(activities).to.deep.equal([{
      id: 1,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-01',
      adjustments: 1600,
      bonuses: 1100,
      commission: 110,
      cpa: 1100,
      deposits: 11000,
      fees: 110,
      grossRevenue: 5100,
      netRevenue: 4100,
      tax: 110,
      turnover: 21000,
    },
    {
      id: 7,
      playerId: 354733,
      brandId: 'KK',
      activityDate: '2019-10-01',
      adjustments: 1600,
      bonuses: 1100,
      commission: 110,
      cpa: 1100,
      deposits: 11000,
      fees: 110,
      grossRevenue: 5100,
      netRevenue: 4100,
      tax: 110,
      turnover: 21000,
    },
    {
      id: 13,
      playerId: 354734,
      brandId: 'LD',
      activityDate: '2019-10-01',
      adjustments: 1600,
      bonuses: 1100,
      commission: 110,
      cpa: 1100,
      deposits: 11000,
      fees: 110,
      grossRevenue: 5100,
      netRevenue: 4100,
      tax: 110,
      turnover: 21000,
    },
    {
      id: 19,
      playerId: 354735,
      brandId: 'OS',
      activityDate: '2019-10-01',
      adjustments: 1600,
      bonuses: 1100,
      commission: 110,
      cpa: 1100,
      deposits: 11000,
      fees: 110,
      grossRevenue: 5100,
      netRevenue: 4100,
      tax: 110,
      turnover: 21000,
    },
    {
      id: 2,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-15',
      adjustments: 3000,
      bonuses: 2500,
      commission: 250,
      cpa: 2500,
      deposits: 25000,
      fees: 250,
      grossRevenue: 6500,
      netRevenue: 5500,
      tax: 250,
      turnover: 35000,
    },
    {
      id: 8,
      playerId: 354733,
      brandId: 'KK',
      activityDate: '2019-10-15',
      adjustments: 3000,
      bonuses: 2500,
      commission: 250,
      cpa: 2500,
      deposits: 25000,
      fees: 250,
      grossRevenue: 6500,
      netRevenue: 5500,
      tax: 250,
      turnover: 35000,
    },
    {
      id: 14,
      playerId: 354734,
      brandId: 'LD',
      activityDate: '2019-10-15',
      adjustments: 3000,
      bonuses: 2500,
      commission: 250,
      cpa: 2500,
      deposits: 25000,
      fees: 250,
      grossRevenue: 6500,
      netRevenue: 5500,
      tax: 250,
      turnover: 35000,
    },
    {
      id: 20,
      playerId: 354735,
      brandId: 'OS',
      activityDate: '2019-10-15',
      adjustments: 3000,
      bonuses: 2500,
      commission: 250,
      cpa: 2500,
      deposits: 25000,
      fees: 250,
      grossRevenue: 6500,
      netRevenue: 5500,
      tax: 250,
      turnover: 35000,
    },
    {
      id: 3,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-31',
      adjustments: 4600,
      bonuses: 4100,
      commission: 410,
      cpa: 4100,
      deposits: 41000,
      fees: 410,
      grossRevenue: 8100,
      netRevenue: 7100,
      tax: 410,
      turnover: 51000,
    },
    {
      id: 9,
      playerId: 354733,
      brandId: 'KK',
      activityDate: '2019-10-31',
      adjustments: 4600,
      bonuses: 4100,
      commission: 410,
      cpa: 4100,
      deposits: 41000,
      fees: 410,
      grossRevenue: 8100,
      netRevenue: 7100,
      tax: 410,
      turnover: 51000,
    },
    {
      id: 15,
      playerId: 354734,
      brandId: 'LD',
      activityDate: '2019-10-31',
      adjustments: 4600,
      bonuses: 4100,
      commission: 410,
      cpa: 4100,
      deposits: 41000,
      fees: 410,
      grossRevenue: 8100,
      netRevenue: 7100,
      tax: 410,
      turnover: 51000,
    },
    {
      id: 21,
      playerId: 354735,
      brandId: 'OS',
      activityDate: '2019-10-31',
      adjustments: 4600,
      bonuses: 4100,
      commission: 410,
      cpa: 4100,
      deposits: 41000,
      fees: 410,
      grossRevenue: 8100,
      netRevenue: 7100,
      tax: 410,
      turnover: 51000,
    }]);
  });

  it('can get sub affiliates', async () => {
    const subAffiliates = await repository.getSubAffiliates(pg, 3232323);

    expect(subAffiliates).to.deep.equal([{
      id: 100000,
      name: 'Random Affiliate',
      floorBrandCommission: true,
      commissionShare: 10,
    }, {
      id: 100004,
      name: 'Random Affiliate',
      floorBrandCommission: true,
      commissionShare: 10,
    }, {
      id: 100008,
      name: 'Random Affiliate',
      floorBrandCommission: true,
      commissionShare: 10,
    }, {
      id: 100012,
      name: 'Random Affiliate',
      floorBrandCommission: true,
      commissionShare: 10,
    }, {
      id: 100016,
      name: 'Random Affiliate',
      floorBrandCommission: true,
      commissionShare: 10,
    }]);
  });

  it('can find affiliate by email', async () => {
    const affiliate = await repository.findAffiliateByEmail(pg, `random${timeStamp}@gmail.com`);
    expect(affiliate).to.deep.equal({
      id: affiliate && affiliate.id,
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
      userId: 0,
      masterId: null,
      tcVersion: 1,

      createdAt: affiliate && affiliate.createdAt,
      updatedAt: affiliate && affiliate.updatedAt,

      lastLoginDate: affiliate && affiliate.lastLoginDate,

      apiToken: null,
    });
  });

  it('can update affiliate password', async () => {
    const affiliate = await repository.updateAffiliatePassword(pg, affiliateId, '54672354276452736', '9292992929');
    expect(affiliate).to.deep.equal({
      id: affiliate && affiliate.id,
      masterId: null,
      hash: '54672354276452736',
      salt: '9292992929',

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
      userId: 0,
      tcVersion: 1,

      createdAt: affiliate && affiliate.createdAt,
      updatedAt: affiliate && affiliate.updatedAt,

      lastLoginDate: affiliate && affiliate.lastLoginDate,

      apiToken: null,
    });
    await repository.updateAffiliatePassword(pg, affiliateId, '90534859043845093', '3485903485');
  });


  it('can get cumulative deposit (positive)', async () => {
    const cumulativeBalance = await repository.getCumulativeDeposit(pg, 354742, 2019, 11, 1);
    expect(cumulativeBalance).to.be.equal(77000);
  });

  it('can get cumulative deposit (zero)', async () => {
    const cumulativeBalance = await repository.getCumulativeDeposit(pg, 354742, 2019, 10, 1);
    expect(cumulativeBalance).to.be.equal(0);
  });

  it('can get active affiliates', async () => {
    const affiliates = await repository.getActiveAffiliates(pg, 2019, 10);
    expect(affiliates).to.containSubset([{
      id: 3232323,
      name: 'Giant Affiliate',
    }, {
      id: 5454545,
      name: 'Mega Affiliate',
    }, {
      id: 7676767,
      name: 'Super Affiliate',
    }]);
  });

  it('can get active affiliates (incl. random one)', async () => {
    const affiliates = await repository.getActiveAffiliates(pg, 2019, 11);
    expect(affiliates).to.containSubset([{
      id: 3232323,
      name: 'Giant Affiliate',
    }, {
      id: 5454545,
      name: 'Mega Affiliate',
    }, {
      id: 100000,
      name: 'Random Affiliate',
    }, {
      id: 7676767,
      name: 'Super Affiliate',
    }]);
  });

  it('can calculate commissions', async () => {
    const activities = await repository.calculateCommissions(pg, 555555, 2019, 11, 25);
    expect(activities).to.deep.equal([{
      id: activities[0].id,
      playerId: 555555,
      activityDate: '2019-11-15',
      deposits: 10000,
      turnover: 300000,
      grossRevenue: 100000,
      bonuses: 10000,
      adjustments: 20000,
      fees: 25000,
      tax: 0,
      netRevenue: 45000,
      commission: 11250,
      cpa: 4500,
    }, {
      id: activities[1].id,
      playerId: 555555,
      activityDate: '2019-11-16',
      deposits: 200000,
      turnover: 300000,
      grossRevenue: -100000,
      bonuses: 10000,
      adjustments: 20000,
      fees: 0,
      tax: 0,
      netRevenue: -130000,
      commission: -32500,
      cpa: 0,
    }]);
  });
});
