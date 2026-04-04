// @flow
const pg = require('gstech-core/modules/pg');

const { createRewardDefinition } = require('../modules/reward-definitions/RewardDefinitions');
const { upsertReward } = require('../modules/rewards/Rewards');
const getMarkkaRewardAndTarget = require('./markka');
const cleanData = require('../../jobs/cleanData');
const { games } = require('../mockData');

describe('getMarkkaRewardsAndTarget', () => {
  let rd;
  let markka;
  before(async () => {
    await pg('games').insert(games);
    rd = (await createRewardDefinition(pg, { rewardType: 'markka', brandId: 'KK' })).id;

    markka = (await upsertReward(pg, { rewardDefinitionId: rd, bonusCode: 'Some code4', creditType: 'markka', description: '', externalId: 'Markka', order: 1 })).id;
  });

  after(cleanData);

  it('returns correct reward with progress modifier when no progress exists', async () => {
    const rewardAndTarget = await getMarkkaRewardAndTarget(pg, rd, 1);

    expect(rewardAndTarget.rewards.length).to.equal(5);
    expect(rewardAndTarget.rewards[0].id).to.equal(markka);
    expect(rewardAndTarget.target).to.equal(20000);
    expect(rewardAndTarget.progressModifier && rewardAndTarget.progressModifier.contribution).to.equal(10000);
  });

  it('returns correct reward for avg bet 30 with 1 progress', async () => {
    const playerId = 1;
    const [progress] = await pg('progresses')
      .insert({
        rewardDefinitionId: rd,
        playerId,
        perRewardDefinitionCount: 1,
        target: 10000,
        contribution: 30,
        betCount: 1,
      })
      .returning('id');
    const progressId = progress?.id;
    expect(progressId).to.exist();
    await pg('game_progresses').insert({ progressId, gameId: games[0].id, betAmount: 30, betCount: 1, playerId });
    const rewardAndTarget = await getMarkkaRewardAndTarget(pg, rd, playerId);

    expect(rewardAndTarget.rewards.length).to.equal(10);
    expect(rewardAndTarget.rewards[0].id).to.equal(markka);
    expect(rewardAndTarget.rewards[1].id).to.equal(markka);
    expect(rewardAndTarget.target).to.equal(40000);

    // Add more bets without changing the avg
    await pg('progresses').update({ contribution: 120, betCount: 4 }).where({ id: progressId });
    await pg('game_progresses').update({ betAmount: 120, betCount: 4 }).where({ progressId });

    const rewardAndTarget2 = await getMarkkaRewardAndTarget(pg, rd, playerId);
    expect(rewardAndTarget2.rewards.length).to.equal(10);
    expect(rewardAndTarget2.rewards[0].id).to.equal(markka);
    expect(rewardAndTarget2.rewards[1].id).to.equal(markka);
    expect(rewardAndTarget2.target).to.equal(40000);
  });

  it('returns correct reward for avg bet 50 with 2 game progresses', async () => {
    const playerId = 2;
    const [progress] = await pg('progresses')
      .insert({
        rewardDefinitionId: rd,
        playerId,
        perRewardDefinitionCount: 1,
        target: 10000,
        contribution: 100,
        betCount: 2,
      })
      .returning('id');
    const progressId = progress?.id;
    expect(progressId).to.exist()
    await pg('game_progresses').insert({ progressId, gameId: games[0].id, betAmount: 10, betCount: 1, winAmount: 0, playerId });
    await pg('game_progresses').insert({ progressId, gameId: games[1].id, betAmount: 90, betCount: 1, winAmount: 0, playerId });

    const rewardAndTarget = await getMarkkaRewardAndTarget(pg, rd, playerId);

    expect(rewardAndTarget.rewards.length).to.equal(25);
    expect(rewardAndTarget.target).to.equal(100000);
  });

  it('returns reduced target for bonus level', async () => {
    const playerId = 3;
    const [progress] = await pg('progresses')
      .insert({
        rewardDefinitionId: rd,
        playerId,
        perRewardDefinitionCount: 2,
        target: 10000,
        contribution: 120,
        betCount: 1,
      })
      .returning('id');
    const progressId = progress?.id;
    expect(progressId).to.exist();
    await pg('game_progresses').insert({ progressId, gameId: games[0].id, betAmount: 120, betCount: 1, winAmount: 0, playerId });

    const targetAndReward = await getMarkkaRewardAndTarget(pg, rd, playerId);

    expect(targetAndReward.rewards.length).to.equal(50);
    expect(targetAndReward.target).to.equal(100000);
    expect(targetAndReward.progressModifier).to.deep.equal({ multiplier: 2 });
  });

  it('does not break if the avgBet is over the roof', async () => {
    const playerId = 4;
    const [progress] = await pg('progresses')
      .insert({
        rewardDefinitionId: rd,
        playerId,
        perRewardDefinitionCount: 2,
        target: 100000000,
        contribution: 120,
        betCount: 1,
      })
      .returning('id');
    const progressId = progress?.id;
    expect(progressId).to.exist();
    await pg('game_progresses').insert({ progressId, gameId: games[0].id, betAmount: 990000, betCount: 129, winAmount: 514000, playerId });

    const targetAndReward = await getMarkkaRewardAndTarget(pg, rd, playerId)

    expect(targetAndReward.rewards.length).to.equal(5000);
  });
});
