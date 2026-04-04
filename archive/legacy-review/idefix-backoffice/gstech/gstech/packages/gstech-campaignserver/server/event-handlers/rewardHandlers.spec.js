// @flow
import type { CampaignDraft, RewardRuleDraft } from '../../types/common';
import type { PlayerDraft } from '../modules/Players/repository';

const moment = require('moment-timezone');
const proxyquire = require('proxyquire').noCallThru();

const pg = require('gstech-core/modules/pg');

const { cleanDb } = require('../utils');
const { getRewardsToCredit } = require('../repository');
const { upsertPlayer } = require('../modules/Players/repository');
const {
  createCampaign,
  connectPlayersWithCampaign,
  createRewardRules,
} = require('../modules/Campaigns/repository');
const AudienceBuilder = require('../modules/Campaigns/AudienceRule/AudienceBuilder');
const { countries } = require('../mockData');

const { creditRewardsIfFeasible } = proxyquire('./rewardHandlers', {
  'gstech-core/modules/clients/backend-payment-api': {
    createWageringRequirement: () => true,
  },
  'gstech-core/modules/clients/rewardserver-api': {
    creditReward: () => true,
  },
});

describe('rewardHandlers', () => {
  let playerId1;
  let playerId2;
  let campaignId1;
  let campaignId2;
  let rewardRulesIds1;
  let rewardRulesIds2;

  const campaignDraft1: CampaignDraft = {
    brandId: 'LD',
    name: 'Campaign1',
    status: 'running',
    audienceType: 'static',
    startTime: new Date(),
    creditMultiple: false,
    migrated: false,
  };
  const campaignDraft2: CampaignDraft = {
    brandId: 'LD',
    name: 'Campaign2',
    status: 'running',
    audienceType: 'dynamic',
    startTime: new Date(),
    creditMultiple: false,
    migrated: false,
  };
  const playerDraft1: PlayerDraft = {
    externalId: 100,
    brandId: 'LD',
    username: 'username',
    email: 'email@gmail.com',
    firstName: 'Anton',
    mobilePhone: '3725551122',
    countryId: 'FI',
    languageId: 'EE',
    currencyId: 'EUR',
    allowEmailPromotions: true,
    allowSMSPromotions: true,
    createdAt: new Date(2019, 1, 2),
    numDeposits: 1,
    gamblingProblem: false,
    tags: [],
    segments: [],
  };
  const playerDraft2: PlayerDraft = {
    externalId: 200,
    brandId: 'LD',
    username: 'username',
    email: 'email@gmail.com',
    firstName: 'Baron',
    mobilePhone: '3725551133',
    countryId: 'FI',
    languageId: 'EE',
    currencyId: 'EUR',
    allowEmailPromotions: true,
    allowSMSPromotions: true,
    createdAt: new Date(2019, 1, 1),
    numDeposits: 5,
    gamblingProblem: false,
    tags: [],
    segments: [],
  };
  const rewardRulesDraft1: RewardRuleDraft[] = [
    {
      trigger: 'deposit',
      minDeposit: 0,
      maxDeposit: 50,
      rewardId: 123,
      wager: 1,
      useOnCredit: false,
      quantity: 1,
      titles: {
        en: { text: 'title1' },
        de: { text: 'sssss1' },
      },
    },
    {
      trigger: 'deposit',
      minDeposit: 0,
      maxDeposit: 50,
      rewardId: 321,
      wager: 1,
      useOnCredit: false,
      quantity: 1,
      titles: {
        en: { text: 'title2' },
        de: { text: 'sssss2' },
      },
    },
  ];
  const rewardRulesDraft2: RewardRuleDraft[] = [
    {
      trigger: 'deposit',
      minDeposit: 0,
      maxDeposit: 50,
      rewardId: 1,
      wager: 1,
      useOnCredit: false,
      quantity: 1,
      titles: {
        en: { text: 'title3' },
        de: { text: 'sssss3' },
      },
    },
    {
      trigger: 'deposit',
      minDeposit: 50,
      maxDeposit: null,
      rewardId: 2,
      wager: 1,
      useOnCredit: false,
      quantity: 1,
      titles: {
        en: { text: 'title4' },
        de: { text: 'sssss4' },
      },
    },
  ];

  beforeEach(async () => {
    await cleanDb();
    await pg('countries').insert(countries, ['id']);
    playerId1 = (await upsertPlayer(pg, playerDraft1)).id;
    playerId2 = (await upsertPlayer(pg, playerDraft2)).id;
    campaignId1 = await createCampaign(pg, campaignDraft1);
    campaignId2 = await createCampaign(pg, campaignDraft2);
    const ab1 = new AudienceBuilder(pg, { ...campaignDraft1, id: campaignId1 });
    const ab2 = new AudienceBuilder(pg, { ...campaignDraft2, id: campaignId2 });
    ab1.in('players.externalId', [100]);
    ab2.in('players.externalId', [200]);

    await connectPlayersWithCampaign(pg, ab1.getQueryBuilder(), campaignId1);
    await connectPlayersWithCampaign(pg, ab2.getQueryBuilder(), campaignId2);
    rewardRulesIds1 = await createRewardRules(pg, rewardRulesDraft1, campaignId1);
    rewardRulesIds2 = await createRewardRules(pg, rewardRulesDraft2, campaignId2);
  });

  describe('getRewardsToCredit', () => {
    it('for 2 matching reward rules for 1 campaign should return 2 rewards', async () => {
      const result = await getRewardsToCredit(pg, 100, 'deposit', [campaignId1], 2000, new Date());

      const expectedReward1 = {
        rewardRulesId: rewardRulesIds1[0],
        rewardId: rewardRulesDraft1[0].rewardId,
        creditMultiple: campaignDraft1.creditMultiple,
        playerId: playerId1,
        campaignId: campaignId1,
        minDeposit: rewardRulesDraft1[0].minDeposit,
        maxDeposit: rewardRulesDraft1[0].maxDeposit,
        campaignName: campaignDraft1.name,
        titles: rewardRulesDraft1[0].titles,
        wager: rewardRulesDraft1[0].wager,
        useOnCredit: rewardRulesDraft1[0].useOnCredit,
        quantity: rewardRulesDraft1[0].quantity,
      };
      expect(result.length).to.equal(2);
      expect(result[0]).to.deep.equal(expectedReward1);
    });

    it('for 2 matching reward rules for 1 campaign with "creditMultiple" false and 1 reward already credited should return 0 rewards', async () => {
      const creditRewardsProps = {
        externalPlayerId: 100,
        eventType: 'deposit',
        brandId: 'LD',
        username: 'username',
        eventId: '123',
        amount: 2000,
        transactionKey: '123',
        currencyId: 'EUR',
        campaignIds: [campaignId1],
        timestamp: new Date(),
      };
      await creditRewardsIfFeasible(pg, creditRewardsProps);

      const result = await getRewardsToCredit(
        pg,
        creditRewardsProps.externalPlayerId,
        'deposit',
        [campaignId1],
        creditRewardsProps.amount,
        new Date(),
      );

      expect(result.length).to.equal(0);
    });

    it('for 2 matching reward rules for 1 campaign with "creditMultiple" true and 1 reward already credited should return 2 rewards', async () => {
      const depositEvent: any = { deposit: { amount: 1000 }, player: { id: 100 } };
      await pg('campaigns').update({ creditMultiple: true }).where({ id: campaignId1 });

      const result = await getRewardsToCredit(
        pg,
        depositEvent.player.id,
        'deposit',
        [campaignId1],
        depositEvent.deposit.amount,
        new Date(),
      );

      expect(result.length).to.equal(2);
      const expectedReward1 = {
        rewardRulesId: rewardRulesIds1[0],
        rewardId: rewardRulesDraft1[0].rewardId,
        creditMultiple: campaignDraft1.creditMultiple,
        playerId: playerId1,
        campaignId: campaignId1,
        minDeposit: rewardRulesDraft1[0].minDeposit,
        maxDeposit: rewardRulesDraft1[0].maxDeposit,
        campaignName: campaignDraft1.name,
        titles: rewardRulesDraft1[0].titles,
        wager: rewardRulesDraft1[0].wager,
        useOnCredit: rewardRulesDraft1[0].useOnCredit,
        quantity: rewardRulesDraft1[0].quantity,
      };
      expect(result[0]).to.deep.equal({ ...expectedReward1, creditMultiple: true });
    });

    it('for 2 matching reward rules for 1 campaign but with amount outside of range should return 0 rewards', async () => {
      const result = await getRewardsToCredit(pg, 100, 'deposit', [campaignId1], 7000, new Date());
      expect(result.length).to.equal(0);
    });

    it('credit correctly reward if maxDeposit is null', async () => {
      const [{ id: newRewardRuleId }] = await pg('reward_rules').insert(
        { ...rewardRulesDraft1[0], maxDeposit: null, campaignId: campaignId1 },
        ['id'],
      );

      const result = await getRewardsToCredit(pg, 100, 'deposit', [campaignId1], 7000, new Date());
      expect(result.length).to.equal(1);
      expect(result[0].rewardRulesId).to.equal(newRewardRuleId);
    });

    it('always credit reward with "wager" 0', async () => {
      const [{ id: newRewardRuleId }] = await pg('reward_rules').insert(
        { ...rewardRulesDraft1[0], maxDeposit: null, campaignId: campaignId1, wager: 0 },
        ['id'],
      );
      const result = await getRewardsToCredit(pg, 100, 'deposit', [], 7000, moment().add(1, 'second'));
      expect(result.length).to.equal(1);
      expect(result[0].rewardRulesId).to.equal(newRewardRuleId);
    });

    it('credit rewards from the given campaigns even if player is removed', async () => {
      const depositTs = new Date();
      await pg('campaigns_players')
        .where({ playerId: playerId2 })
        .update({ removedAt: new Date() });
      const result = await getRewardsToCredit(pg, 200, 'deposit', [campaignId2], 4000, depositTs);
      expect(result.length).to.equal(1);
      expect(result[0].rewardRulesId).to.equal(rewardRulesIds2[0]);
    });
  });
});
