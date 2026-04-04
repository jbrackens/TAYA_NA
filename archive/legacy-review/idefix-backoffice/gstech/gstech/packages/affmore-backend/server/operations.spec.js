/* @flow */
const { DateTime } = require('luxon');

const pg = require('gstech-core/modules/pg');
const operations = require('./operations');
const repository = require('./modules/admin/affiliates/repository');
const plansRepository = require('./modules/admin/plans/repository');
const playersRepository = require('./modules/admin/affiliates/players/repository');
const linksRepository = require('./modules/admin/affiliates/links/repository');

describe('Operations Tests', () => {
  describe('Using default fees', () => {
    it('can update player registration', async () => {
      const registration = {
        playerId: 555555,
        countryCode: 'EE',
        bannerTag: '',
        registrationIP: '127.0.0.1',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
        username: 'LD_Jack.Sparrow_555555',
      };

      const [link] = await linksRepository.getAffiliateLinks(pg, 100000);
      const plan = await plansRepository.getPlan(pg, 1);

      if (!plan) throw Error('plan not found');

      const player = await operations.updatePlayerRegistration(
        pg,
        registration,
        link,
        plan,
        'LD',
        100000,
      );
      expect(player).to.deep.equal({
        id: 555555,
        affiliateId: 100000,
        planId: plan.id,
        linkId: link.id,
        clickId: null,
        brandId: 'LD',
        countryId: 'EE',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
      });
    });

    it('can update player registration (incl. clickId)', async () => {
      const registration = {
        playerId: 555555,
        countryCode: 'EE',
        bannerTag: '',
        registrationIP: '127.0.0.1',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
        username: 'LD_Jack.Sparrow_555555',
      };

      const [link] = await linksRepository.getAffiliateLinks(pg, 100000);

      const clickDraft = {
        linkId: link.id,
        clickDate: DateTime.utc().toJSDate(),
        ipAddress: '127.0.0.1',
        userAgent: 'UA',
        referer: '.',
      };
      const click = await linksRepository.createClick(pg, clickDraft);
      const plan = await plansRepository.getPlan(pg, 1);

      if (!plan) throw Error('plan not found');

      const player = await operations.updatePlayerRegistration(
        pg,
        registration,
        link,
        plan,
        'LD',
        100000,
        click.id,
      );
      expect(player).to.deep.equal({
        id: 555555,
        affiliateId: 100000,
        planId: plan.id,
        linkId: link.id,
        clickId: click.id,
        brandId: 'LD',
        countryId: 'EE',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
      });
    });

    it('can update player activity', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const affiliate: any = await repository.getAffiliate(pg, activity.affiliateId);
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        affiliate.allowNegativeFee,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 0,
        netRevenue: 45000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with tax)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const affiliate: any = await repository.getAffiliate(pg, activity.affiliateId);
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        { ...player, countryId: 'DE' },
        affiliate.allowNegativeFee,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 19000,
        netRevenue: 26000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with positive fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        false,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 0,
        tax: 0,
        netRevenue: -130000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: -25000,
        tax: 0,
        netRevenue: -105000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with NRS = 0 and CPA = 0)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 1, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 0,
        netRevenue: 45000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with NRS = 45 and CPA = 1000)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 0,
        netRevenue: 45000,
        commission: 20250,
        cpa: 1000,
      });
    });

    it('can update player activity (with existing rule that overwrites NRS and CPA)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 9999,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-15',
        deposits: 9999,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 0,
        netRevenue: 45000,
        commission: 13500,
        cpa: 2000,
      });
    });

    it('can update player activity (with cumulative cpa)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 10000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
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
        commission: 13500,
        cpa: 4500,
      });
    });

    it('can update player activity (with previous deposit)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 10000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-16',
        deposits: 10000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 25000,
        tax: 0,
        netRevenue: 45000,
        commission: 13500,
        cpa: 0,
      });
    });

    it('can update player activity (with negative grossRevenue and allowing negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555555,
        activityDate: '2019-11-16',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: -25000,
        tax: 0,
        netRevenue: -105000,
        commission: -47250,
        cpa: 0,
      });
    });

    it('can update player activity (with negative grossRevenue and not allowing negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555555,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        false,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
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
        commission: -58500,
        cpa: 0,
      });
    });

    it('can update affiliate ladder commission with minimal nrs', async () => {
      const activities = await operations.updateAffiliateCommission(pg, 100000, 2019, 11);
      expect(activities).to.deep.equal([
        {
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
        },
        {
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
        },
      ]);
    });

    it('can close affiliate month with commission', async () => {
      const payments = await operations.closeAffiliateMonth(pg, 7676767, false, 2019, 10, 0);
      expect(payments).to.deep.equal([
        {
          id: payments[0].id,
          affiliateId: 7676767,
          invoiceId: payments[0].invoiceId,
          transactionId: payments[0].transactionId,
          transactionDate: payments[0].transactionDate,
          month: 10,
          year: 2019,
          type: 'Commission',
          description: 'Affiliate #7676767 commission for 10.2019',
          amount: 3080,
          createdBy: 0,
        },
        {
          id: payments[1].id,
          affiliateId: 7676767,
          invoiceId: payments[1].invoiceId,
          transactionId: payments[1].transactionId,
          transactionDate: payments[1].transactionDate,
          month: 10,
          year: 2019,
          type: 'CPA',
          description: 'Affiliate #7676767 CPA for 10.2019',
          amount: 30800,
          createdBy: 0,
        },
      ]);
    });

    it('can close affiliate month without commission', async () => {
      const payments = await operations.closeAffiliateMonth(pg, 100000, false, 2019, 11, 1);
      expect(payments).to.deep.equal([
        {
          id: payments[0].id,
          affiliateId: 100000,
          invoiceId: payments[0].invoiceId,
          transactionId: payments[0].transactionId,
          transactionDate: payments[0].transactionDate,
          month: 11,
          year: 2019,
          type: 'CPA',
          description: 'Affiliate #100000 CPA for 11.2019',
          amount: 4500,
          createdBy: 1,
        },
      ]);
    });
  });

  describe('Using custom admin fee of 10%', () => {
    it('can update player registration', async () => {
      const registration = {
        playerId: 555556,
        countryCode: 'EE',
        bannerTag: '',
        registrationIP: '127.0.0.1',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
        username: 'LD_Jack.Sparrow_555556',
      };

      const [link] = await linksRepository.getAffiliateLinks(pg, 100001);
      const plan = await plansRepository.getPlan(pg, 1);

      if (!plan) throw Error('plan not found');

      const player = await operations.updatePlayerRegistration(
        pg,
        registration,
        link,
        plan,
        'LD',
        100001,
      );
      expect(player).to.deep.equal({
        id: 555556,
        affiliateId: 100001,
        planId: plan.id,
        linkId: link.id,
        clickId: null,
        brandId: 'LD',
        countryId: 'EE',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
      });
    });

    it('can update player registration (incl. clickId)', async () => {
      const registration = {
        playerId: 555556,
        countryCode: 'EE',
        bannerTag: '',
        registrationIP: '127.0.0.1',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
        username: 'LD_Jack.Sparrow_555556',
      };

      const [link] = await linksRepository.getAffiliateLinks(pg, 100001);

      const clickDraft = {
        linkId: link.id,
        clickDate: DateTime.utc().toJSDate(),
        ipAddress: '127.0.0.1',
        userAgent: 'UA',
        referer: '.',
      };
      const click = await linksRepository.createClick(pg, clickDraft);
      const plan = await plansRepository.getPlan(pg, 1);

      if (!plan) throw Error('plan not found');

      const player = await operations.updatePlayerRegistration(
        pg,
        registration,
        link,
        plan,
        'LD',
        100001,
        click.id,
      );
      expect(player).to.deep.equal({
        id: 555556,
        affiliateId: 100001,
        planId: plan.id,
        linkId: link.id,
        clickId: click.id,
        brandId: 'LD',
        countryId: 'EE',
        registrationDate: DateTime.utc(2019, 11, 1).toJSDate(),
      });
    });

    it('can update player activity', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const affiliate: any = await repository.getAffiliate(pg, activity.affiliateId);
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        affiliate.allowNegativeFee,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with tax)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const affiliate: any = await repository.getAffiliate(pg, activity.affiliateId);
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        { ...player, countryId: 'DE' },
        affiliate.allowNegativeFee,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 19000,
        netRevenue: 41000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with positive fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        false,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 0,
        tax: 0,
        netRevenue: -130000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(
        pg,
        player.planId,
        player.countryId,
      );

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: -10000,
        tax: 0,
        netRevenue: -120000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with NRS = 0 and CPA = 0)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 1, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 0,
        cpa: 0,
      });
    });

    it('can update player activity (with NRS = 45 and CPA = 1000)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 27000,
        cpa: 1000,
      });
    });

    it('can update player activity (with existing rule that overwrites NRS and CPA)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 9999,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 9999,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 18000,
        cpa: 2000,
      });
    });

    it('can update player activity (with cumulative cpa)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-15', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 10000,
      };

      const date = DateTime.utc(2019, 11, 15);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-15',
        deposits: 10000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 18000,
        cpa: 4500,
      });
    });

    it('can update player activity (with previous deposit)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 10000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 2, 'FI');

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-16',
        deposits: 10000,
        turnover: 300000,
        grossRevenue: 100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 10000,
        tax: 0,
        netRevenue: 60000,
        commission: 18000,
        cpa: 0,
      });
    });

    it('can update player activity (with negative grossRevenue and allowing negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        true,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-16',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: -10000,
        tax: 0,
        netRevenue: -120000,
        commission: -54000,
        cpa: 0,
      });
    });

    it('can update player activity (with negative grossRevenue and not allowing negative fee)', async () => {
      const activity = {
        transferId: '',
        playerId: 555556,
        activityDate: '2019-11-16', // day
        brandId: 'LD',
        affiliateId: 100001,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        turnover: 300000,
        deposits: 200000,
      };

      const date = DateTime.utc(2019, 11, 16);

      const player: any = await playersRepository.getPlayer(
        pg,
        activity.affiliateId,
        activity.playerId,
      );
      const ruleOrPlan: any = await plansRepository.getRuleOrPlan(pg, 3, player.countryId);

      const playerActivity = await operations.updatePlayerActivity(
        pg,
        activity,
        ruleOrPlan,
        player,
        false,
        date.year,
        date.month,
        date.day,
      );
      expect(playerActivity).to.deep.equal({
        id: playerActivity.id,
        playerId: 555556,
        activityDate: '2019-11-16',
        deposits: 200000,
        turnover: 300000,
        grossRevenue: -100000,
        bonuses: 10000,
        adjustments: 20000,
        fees: 0,
        tax: 0,
        netRevenue: -130000,
        commission: -58500,
        cpa: 0,
      });
    });

    it('can update affiliate ladder commission with minimal nrs', async () => {
      const activities = await operations.updateAffiliateCommission(pg, 100001, 2019, 11);
      expect(activities).to.deep.equal([
        {
          id: activities[0].id,
          playerId: 555556,
          activityDate: '2019-11-15',
          deposits: 10000,
          turnover: 300000,
          grossRevenue: 100000,
          bonuses: 10000,
          adjustments: 20000,
          fees: 10000,
          tax: 0,
          netRevenue: 60000,
          commission: 15000,
          cpa: 4500,
        },
        {
          id: activities[1].id,
          playerId: 555556,
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
        },
      ]);
    });

    it('can close affiliate month with commission', async () => {
      const payments = await operations.closeAffiliateMonth(pg, 7676767, false, 2019, 10, 0);
      expect(payments).to.deep.equal([
        {
          id: payments[0].id,
          affiliateId: 7676767,
          invoiceId: payments[0].invoiceId,
          transactionId: payments[0].transactionId,
          transactionDate: payments[0].transactionDate,
          month: 10,
          year: 2019,
          type: 'Commission',
          description: 'Affiliate #7676767 commission for 10.2019',
          amount: 3080,
          createdBy: 0,
        },
        {
          id: payments[1].id,
          affiliateId: 7676767,
          invoiceId: payments[1].invoiceId,
          transactionId: payments[1].transactionId,
          transactionDate: payments[1].transactionDate,
          month: 10,
          year: 2019,
          type: 'CPA',
          description: 'Affiliate #7676767 CPA for 10.2019',
          amount: 30800,
          createdBy: 0,
        },
      ]);
    });

    it('can close affiliate month without commission', async () => {
      const payments = await operations.closeAffiliateMonth(pg, 100001, false, 2019, 11, 1);
      expect(payments).to.deep.equal([
        {
          id: payments[0].id,
          affiliateId: 100001,
          invoiceId: payments[0].invoiceId,
          transactionId: payments[0].transactionId,
          transactionDate: payments[0].transactionDate,
          month: 11,
          year: 2019,
          type: 'CPA',
          description: 'Affiliate #100001 CPA for 11.2019',
          amount: 4500,
          createdBy: 1,
        },
      ]);
    });
  });
});
