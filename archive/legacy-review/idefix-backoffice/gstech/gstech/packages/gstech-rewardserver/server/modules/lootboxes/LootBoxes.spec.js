/* @flow */
const pg = require('gstech-core/modules/pg');

const cleanData = require('../../../jobs/cleanData');
const { insertKKLootBoxesRewards } = require('../../../jobs/fakeDataFns');
const { createLedger, openLootBox } = require('../ledgers/Ledgers');
const { upsertReward } = require('../rewards/Rewards');
const { createRewardDefinition } = require('../reward-definitions/RewardDefinitions');
const { games } = require('../../mockData');

describe('LootBoxes', () => {
  describe('openLootBox', () => {
    let ledgerId;
    let moneyLedgerId;
    before(async () => {
      const rewardDefinitionId1 = (await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'lootBoxContent' })).id;
      const rewardDefinitionId2 = (await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'shopItem' })).id;
      await insertKKLootBoxesRewards();
      const [progress1] = await pg('progresses').insert({
        rewardDefinitionId: rewardDefinitionId1,
        perRewardDefinitionCount: 1,
        playerId: 1,
        betCount: 2,
        contribution: 100,
        target: 10000,
      }, ['id']);
      const [progress2] = await pg('progresses').insert({
        rewardDefinitionId: rewardDefinitionId2,
        perRewardDefinitionCount: 1,
        playerId: 1,
        betCount: 1,
        contribution: 20,
        target: 10000,
      }, ['id']);
      await pg('game_progresses').insert({
        progressId: progress1.id,
        betCount: 2,
        betAmount: 100,
        winAmount: 100,
        gameId: games[0].id,
        playerId: 1,
      });
      await pg('game_progresses').insert({
        progressId: progress2.id,
        betCount: 1,
        betAmount: 20,
        winAmount: 20,
        gameId: games[0].id,
        playerId: 1,
      });
      await pg('game_progresses').insert({
        progressId: progress1.id,
        betCount: 2,
        betAmount: 100,
        winAmount: 100,
        gameId: games[1].id,
        playerId: 1,
      });
      const rewardId = (await upsertReward(pg, {
        rewardDefinitionId: rewardDefinitionId2,
        creditType: 'lootBox',
        bonusCode: '',
        description: '',
        externalId: 'KKLootBox25',
        order: 1,
        price: 25,
        currency: 'iron',
      })).id;
      ledgerId = (await createLedger(pg, { rewardDefinitionId: rewardDefinitionId2, rewardId, creditDate: new Date(), playerId: 1, source: 'wagering' })).id;
      const moneyLootBox = (await upsertReward(pg, {
        rewardDefinitionId: rewardDefinitionId2,
        creditType: 'lootBox',
        bonusCode: '',
        description: '',
        externalId: 'KKLootBox5000',
        order: 2,
        price: 5000,
        currency: 'iron',
      })).id;
      moneyLedgerId = (await createLedger(pg, { rewardDefinitionId: rewardDefinitionId2, rewardId: moneyLootBox, creditDate: new Date(), playerId: 2, source: 'wagering' })).id;
    });

    after(cleanData);

    it('credit rewards to user', async () => {
      const returnRewards = await openLootBox(pg, ledgerId);

      const rewards = await pg('ledgers')
        .select('rewards.*', 'reward_definitions.rewardType', 'ledgers.id as ledgerId')
        .leftJoin('reward_definitions', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
        .leftJoin('rewards', 'rewards.id', 'ledgers.rewardId')
        .where({ playerId: 1, useDate: null });

      expect(rewards.length).to.equal(returnRewards.length);
      expect(returnRewards[0].creditType).to.equal('freeSpins');
      expect(
        returnRewards.map((r) => ({ ...r, rewardType: 'lootBoxContent' })),
      ).to.have.deep.members(rewards);
    });

    it('credit real money rewards to user', async () => {
      const returnRewards = await openLootBox(pg, moneyLedgerId);

      const rewards = await pg('ledgers')
        .select('rewards.*', 'ledgers.id as ledgerId')
        .leftJoin('reward_definitions', 'reward_definitions.id', 'ledgers.rewardDefinitionId')
        .leftJoin('rewards', 'rewards.id', 'ledgers.rewardId')
        .where({ playerId: 2, useDate: null });

      expect(rewards.length).to.equal(returnRewards.length);
      expect(rewards[0].gameId).to.equal(null);
      expect(rewards[0].creditType).to.equal('real');
      expect(returnRewards).to.include.deep.members(rewards);
    });
  });
});
