/* @flow */

const pg = require('gstech-core/modules/pg');

const getCycleRewardAndTarget = require('./cycle');
const cleanData = require('../../jobs/cleanData');
const { games, rewardDefinitions, rewards } = require('../mockData');

describe('getCycleRewardAndTarget', () => {
  let rewardDefinitionId = rewardDefinitions[2].id;
  let highrollersRewardDefinitionId = rewardDefinitions[3].id;

  before(async () => {
    await pg('reward_definitions').insert(rewardDefinitions);
    await pg('games').insert(games);
    await pg('rewards').insert(
      rewards.map((r, i) => ({
        ...r,
        metadata: { trigger_phase: 5100, skipCycle: i % 2 === 0 },
        rewardDefinitionId,
      })),
    );
    await pg('rewards').insert({
      ...rewards[0],
      id: 10,
      metadata: { trigger_phase: 8000 },
      rewardDefinitionId: highrollersRewardDefinitionId,
    });
  });

  after(cleanData);

  describe('for CJ bounties', () => {
    it('returns 1st reward for first time', async () => {
      const result = await getCycleRewardAndTarget(
        pg,
        rewardDefinitionId,
        'CJ',
        1,
        'CJ_Bounties_new',
        'bountyCycleHighrollers',
      );

      expect(result.rewards.length).to.equal(1);
      expect(result.rewards[0].order).to.equal(1);
      expect(result.rewards[0].rewardDefinitionId).to.equal(rewardDefinitionId);
      expect(result.target).to.equal(510000);
    });

    it('returns a random reward for next time', async () => {
      await pg('progresses').insert({
        rewardDefinitionId,
        perRewardDefinitionCount: 1,
        playerId: 1,
        target: 100,
        betCount: 1,
        contribution: 100,
        completedAt: new Date(),
      });

      const result = await getCycleRewardAndTarget(
        pg,
        rewardDefinitionId,
        'CJ',
        1,
        'CJ_Bounties_new',
        'bountyCycleHighrollers',
      );

      expect(result.rewards.length).to.equal(1);
      expect(rewards.map(({ externalId }) => externalId)).to.include(result.rewards[0].externalId);
      expect(result.target).to.equal(510000);
      expect(!!result.rewards[0].metadata.skipCycle).to.equal(false);
    });

    it('returns a random highroller reward for highrollers', async () => {
      await pg('progresses').insert({
        rewardDefinitionId,
        perRewardDefinitionCount: 1,
        playerId: 2,
        target: 1000,
        betCount: 1,
        contribution: 1000,
        completedAt: new Date(),
      });

      const result = await getCycleRewardAndTarget(
        pg,
        rewardDefinitionId,
        'CJ',
        2,
        'CJ_Bounties_new',
        'bountyCycleHighrollers',
      );

      expect(result.rewards.length).to.equal(1);
      expect(result.rewards[0].rewardDefinitionId).to.equal(highrollersRewardDefinitionId);
      expect(!!result.rewards[0].metadata.skipCycle).to.equal(false);
    });
  });

  describe('for LD rewards', () => {
    before(async () => {
      rewardDefinitionId = rewardDefinitions[4].id;
      highrollersRewardDefinitionId = rewardDefinitions[5].id;

      await pg('rewards').insert({
        ...rewards[0],
        id: 11,
        rewardDefinitionId,
        metadata: { trigger_phase: 10000 },
      });
      await pg('rewards').insert({
        ...rewards[0],
        id: 12,
        rewardDefinitionId: highrollersRewardDefinitionId,
        metadata: { trigger_phase: 50000 },
      });
    });

    it('returns standard reward', async () => {
      const result = await getCycleRewardAndTarget(
        pg,
        rewardDefinitionId,
        'LD',
        1,
        'LD_REWARDS',
        'rewardCycleHighrollers',
      );

      expect(result.rewards.length).to.equal(1);
      expect(result.rewards[0].id).to.equal(11);
      expect(result.target).to.equal(1000000);
    });

    it('returns highroller reward', async () => {
      await pg('progresses').insert({
        rewardDefinitionId,
        perRewardDefinitionCount: 1,
        playerId: 2,
        target: 1000,
        betCount: 1,
        contribution: 1000,
        completedAt: new Date(),
      });

      const result = await getCycleRewardAndTarget(
        pg,
        rewardDefinitionId,
        'LD',
        2,
        'LD_REWARDS',
        'rewardCycleHighrollers',
      );

      expect(result.rewards.length).to.equal(1);
      expect(result.rewards[0].id).to.equal(12);
      expect(result.target).to.equal(5000000);
    });
  });
});
