/* @flow */

const pg = require('gstech-core/modules/pg');

const getCoinRewardAndTarget = require('./coin');
const { rewardDefinitions, rewards } = require('../mockData');
const cleanData = require('../../jobs/cleanData');
const cycle = require('./coinCycle.json');

describe('getCoinRewardAndTarget', () => {
  let KKIronRewardDefinitionId;

  before(async () => {
    KKIronRewardDefinitionId = rewardDefinitions[7].id;
    await pg('reward_definitions').insert(rewardDefinitions);
    await pg('rewards').insert([rewards[3], rewards[4]]);
  });

  after(cleanData);

  it('can get first reward for KK', async () => {
    const result = await getCoinRewardAndTarget(pg, KKIronRewardDefinitionId, 'KK', 1);

    expect(result.rewards.length).to.equal(cycle[0].coins);
    expect(result.rewards.map(({ id }) => id)).to.have.members(
      new Array<Id>(cycle[0].coins).fill(rewards[3].id),
    );
    expect(result.target).to.equal(100 * cycle[0].trigger_phase);
  });

  it('can get gold as next reward for KK', async () => {
    await pg('progresses').insert({
      playerId: 1,
      contribution: 100,
      target: 100,
      rewardDefinitionId: KKIronRewardDefinitionId,
      perRewardDefinitionCount: 6,
    });

    const result = await getCoinRewardAndTarget(pg, KKIronRewardDefinitionId, 'KK', 1);

    expect(result.rewards.length).to.equal(cycle[6].coins);
    expect(result.rewards[0].creditType).to.equal('gold');
    expect(result.target).to.equal(100 * cycle[6].trigger_phase);
  });

  it('can start cycle all over again', async () => {
    await pg('progresses').insert({
      playerId: 1,
      contribution: 100,
      target: 100,
      rewardDefinitionId: KKIronRewardDefinitionId,
      perRewardDefinitionCount: cycle.length,
    });

    const result = await getCoinRewardAndTarget(pg, KKIronRewardDefinitionId, 'KK', 1);

    expect(result.rewards.length).to.equal(cycle[0].coins);
    expect(result.rewards[0].creditType).to.equal('iron');
    expect(result.target).to.equal(100 * cycle[0].trigger_phase);
  });
});
