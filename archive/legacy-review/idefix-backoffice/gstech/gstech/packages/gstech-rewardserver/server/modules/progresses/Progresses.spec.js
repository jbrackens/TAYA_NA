/* @flow */

const pg = require('gstech-core/modules/pg');

const { getPlayerActiveProgresses } = require('./Progresses');
const cleanData = require('../../../jobs/cleanData');
const { games, progresses, progressesRewards, rewardDefinitions, rewards } = require('../../mockData');

describe('Progresses repository', () => {
  before(async () => {
    await pg('games').insert(games);
    await pg('reward_definitions').insert(rewardDefinitions);
    await pg('rewards').insert(rewards);
    await pg('progresses').insert(progresses);
    await pg('progresses_rewards').insert(progressesRewards);
  });

  after(cleanData);

  describe('getPlayerActiveProgresses', () => {
    it('properly returns progresses with rewards', async () => {
      const result = await getPlayerActiveProgresses(pg, 1, 'KK');

      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({
        progress: (progresses[0].contribution / progresses[0].target) * 100,
        contribution: progresses[0].contribution,
        target: progresses[0].target,
        betCount: progresses[0].betCount,
        startedAt: result[0].startedAt,
        updatedAt: result[0].updatedAt,
        multiplier: progresses[0].multiplier,
        rewardDefinitionId: rewardDefinitions[0].id,
        rewardType: rewardDefinitions[0].rewardType,
        rewards: [
          { reward: rewards[0], game: { ...games[0], tags: ['tag2', 'tag3'] }, quantity: 1 },
          { reward: rewards[1], game: { ...games[1], tags: [] }, quantity: 2 },
        ],
      });
    });
  });
});
