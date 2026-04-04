/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const repository = require('./repository');

describe('Players Repository', () => {
  const year = 2019;
  const month = 10;

  it('can get player', async () => {
    const player = await repository.getPlayer(pg, 3232323, 354732);
    expect(player).to.deep.equal({
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      countryId: 'CA',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
      brandId: 'CJ',
      deal: 'FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
    });
  });

  it('can get player activities', async () => {
    const activities = await repository.getPlayerActivities(pg, 3232323, 354732);
    expect(activities).to.deep.equal([{
      id: 1,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-01',
      deposits: 11000,
      turnover: 21000,
      grossRevenue: 5100,
      bonuses: 1100,
      adjustments: 1600,
      fees: 110,
      tax: 110,
      netRevenue: 4100,
      commission: 110,
      cpa: 1100,
    }, {
      id: 2,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-15',
      deposits: 25000,
      turnover: 35000,
      grossRevenue: 6500,
      bonuses: 2500,
      adjustments: 3000,
      fees: 250,
      tax: 250,
      netRevenue: 5500,
      commission: 250,
      cpa: 2500,
    }, {
      id: 3,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-10-31',
      deposits: 41000,
      turnover: 51000,
      grossRevenue: 8100,
      bonuses: 4100,
      adjustments: 4600,
      fees: 410,
      tax: 410,
      netRevenue: 7100,
      commission: 410,
      cpa: 4100,
    }, {
      id: 4,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-01',
      deposits: 11000,
      turnover: 21000,
      grossRevenue: 5100,
      bonuses: 1100,
      adjustments: 1600,
      fees: 110,
      tax: 110,
      netRevenue: 4100,
      commission: 110,
      cpa: 1100,
    }, {
      id: 5,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-15',
      deposits: 25000,
      turnover: 35000,
      grossRevenue: 6500,
      bonuses: 2500,
      adjustments: 3000,
      fees: 250,
      tax: 250,
      netRevenue: 5500,
      commission: 250,
      cpa: 2500,
    }, {
      id: 6,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-30',
      deposits: 40000,
      turnover: 50000,
      grossRevenue: 8000,
      bonuses: 4000,
      adjustments: 4500,
      fees: 400,
      tax: 400,
      netRevenue: 7000,
      commission: 400,
      cpa: 4000,
    }]);
  });

  it('can get player activities for a month', async () => {
    const activities = await repository.getPlayerActivities(pg, 3232323, 354732, 2019, 11);
    expect(activities).to.deep.equal([{
      id: 4,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-01',
      deposits: 11000,
      turnover: 21000,
      grossRevenue: 5100,
      bonuses: 1100,
      adjustments: 1600,
      fees: 110,
      tax: 110,
      netRevenue: 4100,
      commission: 110,
      cpa: 1100,
    }, {
      id: 5,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-15',
      deposits: 25000,
      turnover: 35000,
      grossRevenue: 6500,
      bonuses: 2500,
      adjustments: 3000,
      fees: 250,
      tax: 250,
      netRevenue: 5500,
      commission: 250,
      cpa: 2500,
    }, {
      id: 6,
      playerId: 354732,
      brandId: 'CJ',
      activityDate: '2019-11-30',
      deposits: 40000,
      turnover: 50000,
      grossRevenue: 8000,
      bonuses: 4000,
      adjustments: 4500,
      fees: 400,
      tax: 400,
      netRevenue: 7000,
      commission: 400,
      cpa: 4000,
    }]);
  });

  it('can update player', async () => {
    const player = await repository.updatePlayer(pg, 354732, {
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
    });

    expect(player).to.deep.equal({
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,
      brandId: 'CJ',
      countryId: 'CA',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
    });
  });

  it('can fail update not existing player', async () => {
    const player = await repository.updatePlayer(pg, 666666, {
      affiliateId: 3232323,
      planId: 1,
      linkId: 4,
    });

    expect(player).to.deep.equal(undefined);
  });

  it('can get affiliate players', async () => {
    const players = await repository.getAffiliatePlayers(pg, 3232323);
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

  it('can get affiliate players for a month', async () => {
    const players = await repository.getAffiliatePlayers(pg, 3232323, 2019, 11);
    expect(players).to.deep.equal([{
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

  it('can get affiliate players for a month filtered by brand', async () => {
    const players = await repository.getAffiliatePlayers(pg, 3232323, 2019, 11, 'LD');
    expect(players).to.deep.equal([
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

  it('can get registered players count', async () => {
    const { registeredPlayers } = await repository.getAffiliatePlayersCount(pg, 3232323);
    expect(registeredPlayers).to.be.equal(4);
  });

  it('can get registered players count due date', async () => {
    const { registeredPlayers } = await repository.getAffiliatePlayersCount(pg, 3232323, year, month);
    expect(registeredPlayers).to.be.equal(4);
  });

  it('can get registered players count due future date', async () => {
    const { registeredPlayers } = await repository.getAffiliatePlayersCount(pg, 3232323, year, month + 1);
    expect(registeredPlayers).to.be.equal(0);
  });

  it('can get registered players count due past date', async () => {
    const { registeredPlayers } = await repository.getAffiliatePlayersCount(pg, 3232323, year, month - 5);
    expect(registeredPlayers).to.be.equal(0);
  });

  it('can get affiliate player activities', async () => {
    const activities = await repository.getAffiliatesPlayerActivities(pg, year, month);
    expect(activities).to.deep.equal([
      {
        affiliateId: 3232323,
        netRevenue: 66800,
        deposits: 308000,
        commissions: { CJ: 770, FK: 0, KK: 770, LD: 770, OS: 770, SN: 0, VB: 0 },
        commission: 3080,
        cpa: 30800,
        activePlayers: '4',
      },
      {
        affiliateId: 5454545,
        netRevenue: 66800,
        deposits: 308000,
        commissions: { CJ: 770, FK: 0, KK: 770, LD: 770, OS: 770, SN: 0, VB: 0 },
        commission: 3080,
        cpa: 30800,
        activePlayers: '4',
      },
      {
        affiliateId: 7676767,
        netRevenue: 66800,
        deposits: 308000,
        commissions: { CJ: 770, FK: 0, KK: 770, LD: 770, OS: 770, SN: 0, VB: 0 },
        commission: 3080,
        cpa: 30800,
        activePlayers: '4',
      },
    ]);
  });

  it('can get depositing players count for range', async () => {
    const [{ depositingPlayers }] = await repository.getAffiliatesDepositingPlayersCount(pg, year, month);
    expect(depositingPlayers).to.be.equal(4);
  });

  it('can get new depositing players count for range', async () => {
    const [{ depositingPlayers }] = await repository.getAffiliatesDepositingPlayersCount(pg, year, month, true);
    expect(depositingPlayers).to.be.equal(4);
  });

  it('can get new depositing players count for range (next range)', async () => {
    const [{ depositingPlayers }] = await repository.getAffiliatesDepositingPlayersCount(pg, year, month + 1, true);
    expect(depositingPlayers).to.be.equal(1);
  });

  it('can get depositing players count grouped by date', async () => {
    const [,, { depositingPlayers, date }] = await repository.getAffiliatesDepositingPlayersCountGroupedByDate(pg);
    expect(depositingPlayers).to.be.equal(1);
    expect(date).to.be.equal('2019-11-15');
  });

  it('can get new depositing players count grouped by date', async () => {
    const [,, { depositingPlayers, date }] = await repository.getAffiliatesDepositingPlayersCountGroupedByDate(pg, true);
    expect(depositingPlayers).to.be.equal(4);
    expect(date).to.be.equal('2019-10-01');
  });

  it('can get depositing players count', async () => {
    const { depositingPlayers } = await repository.getAffiliateDepositingPlayersCount(pg, 3232323, year, month);
    expect(depositingPlayers).to.be.equal(4);
  });

  it('can get new depositing players count', async () => {
    const { depositingPlayers } = await repository.getAffiliateDepositingPlayersCount(pg, 3232323, year, month, true);
    expect(depositingPlayers).to.be.equal(4);
  });

  it('can get new depositing players count when it is zero', async () => {
    const { depositingPlayers } = await repository.getAffiliateDepositingPlayersCount(pg, 3232323, year, month + 1, true);
    expect(depositingPlayers).to.be.equal(0);
  });

  it('can get active players', async () => {
    const players = await repository.getActivePlayers(pg, 3232323, 2019, 11);
    expect(players).to.deep.equal([{
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 1,
      clickId: 24,

      brandId: 'CJ',
      countryId: 'CA',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),

      deal: 'FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
    }, {
      id: 354733,
      affiliateId: 3232323,
      planId: 2,
      linkId: 2,
      clickId: 23,

      brandId: 'KK',
      countryId: 'FI',
      registrationDate: DateTime.utc(2019, 10, 2).toJSDate(),

      deal: 'Global: 0% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
    }, {
      id: 354734,
      affiliateId: 3232323,
      planId: 3,
      linkId: 3,
      clickId: 22,

      brandId: 'LD',
      countryId: 'DE',
      registrationDate: DateTime.utc(2019, 10, 3).toJSDate(),

      deal: 'Global: 45% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
    }, {
      id: 354735,
      affiliateId: 3232323,
      planId: 4,
      linkId: 4,
      clickId: 21,

      brandId: 'OS',
      countryId: 'NO',
      registrationDate: DateTime.utc(2019, 10, 4).toJSDate(),

      deal: 'Global: 50% / FI: deposit: €100 cpa: €25',
      link: 'Beautiful name of the Link',
    }]);
  });

  it('can upsert player registration', async () => {
    const player = await repository.upsertPlayerRegistration(pg, {
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 4,
      clickId: 24,
      brandId: 'CJ',
      countryId: 'CA',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
    });

    expect(player).to.deep.equal({
      id: 354732,
      affiliateId: 3232323,
      planId: 1,
      linkId: 4,
      clickId: 24,
      brandId: 'CJ',
      countryId: 'CA',
      registrationDate: DateTime.utc(2019, 10, 1).toJSDate(),
    });
  });

  it('can upsert player activity', async () => {
    const activity = await repository.upsertPlayerActivity(pg, {
      playerId: 354732,
      activityDate: '2019-10-01', // day
      deposits: 11000,
      turnover: 21000,
      grossRevenue: 5100,
      bonuses: 1100,
      adjustments: 1600,
      fees: 110,
      tax: 110,
      netRevenue: 4100,
      commission: 110,
      cpa: 1100,
    });

    expect(activity).to.deep.equal({
      id: 1,
      playerId: 354732,
      activityDate: '2019-10-01', // day
      deposits: 11000,
      turnover: 21000,
      grossRevenue: 5100,
      bonuses: 1100,
      adjustments: 1600,
      fees: 110,
      tax: 110,
      netRevenue: 4100,
      commission: 110,
      cpa: 1100,
    });
  });
});
