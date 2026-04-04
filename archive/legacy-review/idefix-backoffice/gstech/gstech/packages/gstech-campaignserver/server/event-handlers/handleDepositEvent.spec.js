/* @flow */
import type { PlayerDraft } from '../modules/Players/repository';

const proxyquire = require('proxyquire');

const pg = require('gstech-core/modules/pg');

const { upsertPlayer } = require('../modules/Players/repository');
const { upsertCountries } = require('../modules/Config/repository');
const { countries, campaigns, players, rewardRules } = require('../mockData');
const { cleanDb } = require('../utils');

const { handleDepositEvent } = proxyquire('./handleDepositEvent', {
  './rewardHandlers': proxyquire('./rewardHandlers', {
    'gstech-core/modules/clients/rewardserver-api': {
      creditReward: () => true,
    },
  }),
});

describe('handleDepositEvent', () => {
  let depositId;
  const playerDraft: PlayerDraft = {
    externalId: 1,
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

  const depositEvent: any = {
    deposit: {
      paymentId: 1,
      playerId: 1,
      timestamp: new Date(),
      amount: 1000,
      index: 1,
    },
    player: {
      id: 1,
      brandId: 'LD',
      username: 'username',
      email: 'email@gmail.com',
      firstName: 'Jack',
      mobilePhone: '4903950077831',
      countryId: 'FI',
      languageId: 'de',
      currencyId: 'EUR',
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      createdAt: new Date('2019-06-01T07:27:58.422Z'),
      numDeposits: 0,
      gamblingProblem: false,
      tags: [],
    },
  };

  before(async () => {
    await cleanDb();
    await upsertCountries(pg, countries.map(({ id, ...rest }) => rest));
    await upsertPlayer(pg, playerDraft);
  });

  it('can insert new record', async () => {
    depositId = await handleDepositEvent(pg, depositEvent);
    expect(depositId).to.be.a('number');
    const [deposit] = await pg('deposits').where({ id: depositId });
    expect(deposit.perPlayerCount).to.equal(2);

    const campaignsDeposits = await pg('campaigns_deposits');
    expect(campaignsDeposits.length).to.equal(0);

    const [player] = await pg('players').where({ externalId: 1 });
    expect(player.numDeposits).to.equal(2);
  });

  it('can update deposit with the same paymentId', async () => {
    const newDepositId = await handleDepositEvent(pg, {
      deposit: { ...depositEvent.deposit, amount: 2000 },
      player: depositEvent.player,
      segments: [],
      updateType: 'Deposit',
    });

    expect(newDepositId).to.equal(depositId);
    const deposit = await pg('deposits').where({ id: depositId }).first();
    expect(deposit.amount).to.equal(2000);
  });
});

describe('handleDepositEvent with NOK currency', () => {
  let depositId;
  const playerDraft: PlayerDraft = {
    externalId: 1,
    brandId: 'LD',
    username: 'username',
    email: 'email@gmail.com',
    firstName: 'Anton',
    mobilePhone: '3725551122',
    countryId: 'FI',
    languageId: 'EE',
    currencyId: 'NOK',
    allowEmailPromotions: true,
    allowSMSPromotions: true,
    createdAt: new Date(2019, 1, 2),
    numDeposits: 1,
    gamblingProblem: false,
    tags: [],
    segments: [],
  };
  const depositEvent: any = {
    deposit: {
      paymentId: 1,
      playerId: 1,
      timestamp: new Date(),
      amount: 100000,
      index: 9,
    },
    segments: [],
    updateType: 'Deposit',
    player: {
      id: 1,
      currencyId: 'NOK',
      brandId: 'LD',
      username: 'username',
      email: 'email@gmail.com',
      firstName: 'Jack',
      mobilePhone: '4903950077831',
      countryId: 'FI',
      languageId: 'de',
      allowEmailPromotions: true,
      allowSMSPromotions: true,
      createdAt: new Date('2019-06-01T07:27:58.422Z'),
      numDeposits: 0,
      gamblingProblem: false,
      tags: [],
    },
  };

  before(async () => {
    await cleanDb();
    await upsertCountries(pg, countries.map(({ id, ...rest }) => rest));
    await upsertPlayer(pg, playerDraft);
  });

  it('can insert new record', async () => {
    depositId = await handleDepositEvent(pg, depositEvent);

    expect(depositId).to.be.a('number');
    const [deposit] = await pg('deposits').where({ id: depositId });
    expect(deposit.perPlayerCount).to.equal(10);
    expect(deposit.convertedAmount).to.equal(10000);
    expect(deposit.amount).to.equal(100000);
    const campaignsDeposits = await pg('campaigns_deposits');
    expect(campaignsDeposits.length).to.equal(0);
  });
});

describe('user stories', () => {
  const player = players[2];
  const depositEvent: any = {
    deposit: {
      paymentId: 3,
      playerId: 3,
      timestamp: new Date(),
      amount: 5000,
      index: 1,
      parameters: {
        campaignIds: [3],
      },
    },
    player: {
      brandId: 'KK',
      username: player.username,
      currencyId: 'EUR',
    },
  };
  const clean = async () => {
    await cleanDb();
    await pg('campaigns').insert(campaigns[2]);
    await pg('countries').insert(countries);
    await pg('players').insert(players);
    await pg('reward_rules').insert({
      ...rewardRules[1],
      campaignId: 3,
      minDeposit: 10,
      maxDeposit: 60,
    });
    await pg('audience_rules').insert({
      id: 1,
      name: 'depositAmount',
      operator: '>=',
      values: 5000,
      campaignId: 3,
    });
  };

  describe('deposit at least 50 and get X reward (!creditMultiple)', () => {
    before(clean);

    it('removes player from campaign and mark as complete', async () => {
      await handleDepositEvent(pg, depositEvent);

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);
      expect(cp[0].removedAt).to.be.a('date');
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 3 });
      expect(cr.length).to.equal(1);
      expect(cr[0]).to.containSubset({
        playerId: player.id,
        campaignId: 3,
        creditMultiple: false,
        rewardRulesId: rewardRules[1].id,
      });
    });

    it('does not credit reward again', async () => {
      await handleDepositEvent(pg, {
        player: depositEvent.player,
        deposit: { ...depositEvent.deposit, paymentId: 4, index: 2 },
      });

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 3 });
      expect(cr.length).to.equal(1);
    });
  });

  describe('deposit at least 50 and get X reward (creditMultiple)', () => {
    before(clean);

    it('do not remove player from campaign', async () => {
      await pg('campaigns').where({ id: 3 }).update({ creditMultiple: true });

      await handleDepositEvent(pg, depositEvent);

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);
      expect(cp[0]).to.containSubset({ removedAt: null, complete: false });
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 3 });
      expect(cr.length).to.equal(1);
      expect(cr[0]).to.containSubset({
        playerId: player.id,
        campaignId: 3,
        creditMultiple: true,
        rewardRulesId: rewardRules[1].id,
      });
    });

    it('can credit the same reward multiple times', async () => {
      await handleDepositEvent(pg, {
        player: depositEvent.player,
        deposit: { ...depositEvent.deposit, paymentId: 4, index: 2 },
      });

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);
      expect(cp[0]).to.containSubset({ removedAt: null, complete: false });
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 3 });
      expect(cr.length).to.equal(2);
      expect(cr).to.containSubset([
        {
          playerId: player.id,
          campaignId: 3,
          creditMultiple: true,
          rewardRulesId: rewardRules[1].id,
        },
        {
          playerId: player.id,
          campaignId: 3,
          creditMultiple: true,
          rewardRulesId: rewardRules[1].id,
        },
      ]);
    });
  });

  describe('deposit at least 50 and get X reward, and then another 50 and get Y reward', () => {
    before(async () => {
      await clean();
      await pg('campaigns').insert({ ...campaigns[2], id: 4, name: 'Campaign4' });
      await pg('audience_rules').insert({
        id: 10,
        campaignId: 4,
        name: 'x',
        operator: 'otherCampaignsMember',
        values: JSON.stringify({ campaignIds: [3], complete: true }),
      });
      await pg('audience_rules').insert({
        id: 11,
        name: 'depositAmount',
        operator: '>=',
        values: 5000,
        campaignId: 4,
      });
      await pg('reward_rules').insert({
        ...rewardRules[1],
        id: 3,
        campaignId: 4,
        minDeposit: 10,
        maxDeposit: 60,
      });
    });

    it('should credit first reward, mark as complete and add player to 2nd campaign', async () => {
      await handleDepositEvent(pg, depositEvent);

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);
      expect(cp[0].removedAt).to.be.a('date');
      expect(cp[0].complete).to.equal(true);
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 3 });
      expect(cr.length).to.equal(1);
      expect(cr[0]).to.containSubset({
        playerId: player.id,
        campaignId: 3,
        creditMultiple: false,
        rewardRulesId: rewardRules[1].id,
      });

      const cp2 = await pg('campaigns_players').where({ campaignId: 4, playerId: player.id });
      expect(cp2.length).to.equal(1);
      expect(cp2[0]).to.containSubset({ removedAt: null, complete: false });
      const cr2 = await pg('credited_rewards').where({ playerId: player.id, campaignId: 4 });
      expect(cr2.length).to.equal(0);
    });

    it('should credit next campaigns reward', async () => {
      await handleDepositEvent(pg, {
        player: depositEvent.player,
        deposit: { ...depositEvent.deposit, paymentId: 4, index: 2, parameters: { campaignIds: [4] } },
      });

      const cp = await pg('campaigns_players').where({ campaignId: 3, playerId: player.id });
      expect(cp.length).to.equal(1);

      const cp2 = await pg('campaigns_players').where({ campaignId: 4, playerId: player.id });
      expect(cp2.length).to.equal(1);
      expect(cp2[0].removedAt).to.be.a('date');
      expect(cp2[0].complete).to.equal(true);
      const cr = await pg('credited_rewards').where({ playerId: player.id, campaignId: 4 });
      expect(cr.length).to.equal(1);
      expect(cr[0]).to.containSubset({
        playerId: player.id,
        campaignId: 4,
        creditMultiple: false,
        rewardRulesId: 3,
      });
    });
  });

  describe('deposit 50, gets rewarded 2 rewards (1 creditMultiple: true, 1 false)', () => {
    before(async () => {
      await cleanDb();
      await pg('campaigns').insert([campaigns[1], { ...campaigns[2], creditMultiple: true }]);
      await pg('countries').insert(countries);
      await pg('players').insert(players);
      await pg('campaigns_players').insert([
        { campaignId: campaigns[1].id, playerId: players[2].id },
        { campaignId: campaigns[2].id, playerId: players[2].id },
      ]);
      await pg('reward_rules').insert([
        { campaignId: campaigns[1].id, trigger: 'deposit', minDeposit: 10, maxDeposit: 60, rewardId: 1, wager: 0, titles: {} },
        { campaignId: campaigns[2].id, trigger: 'deposit', minDeposit: 10, maxDeposit: 60, rewardId: 1, wager: 0, titles: {} },
      ]);
    });

    it('should not complete multiple rewards campaign', async () => {
      await handleDepositEvent(pg, {
        ...depositEvent,
        deposit: {
          ...depositEvent.deposit,
          parameters: { campaignIds: [campaigns[1].id, campaigns[2].id] },
        },
      });

      const cp = await pg('campaigns_players').where({ playerId: players[2].id });
      expect(cp.find(({ campaignId }) => campaignId === campaigns[2].id).removedAt).to.equal(null);
      expect(cp.find(({ campaignId }) => campaignId === campaigns[1].id).removedAt).to.be.a('date');
    });
  });
});
