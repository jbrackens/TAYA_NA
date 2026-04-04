/* @flow */

const pg = require('gstech-core/modules/pg');

const getWheelSpinRewardAndTarget = require('./wheelSpin');
const { rewardDefinitions, rewards } = require('../mockData');
const cleanData = require('../../jobs/cleanData');

describe('wheelSpin getWheelSpinRewardAndTarget', () => {
  let reward;
  before(async () => {
    await pg('reward_definitions').insert(rewardDefinitions);
    reward = {
      ...rewards[0],
      creditType: 'wheelSpin',
      rewardDefinitionId: rewardDefinitions[6].id,
      gameId: null,
      externalId: '',
      cost: null,
      validity: null,
      spinValue: null,
      spinType: null,
      removedAt: null,
      price: null,
      metadata: {},
      currency: null,
    };
    await pg('rewards').insert(reward);
  });

  after(cleanData);

  it('does its job', async () => {
    const result = await getWheelSpinRewardAndTarget(
      pg,
      rewardDefinitions[6].id,
      rewardDefinitions[6].promotion || '',
    );

    expect(result).to.deep.equal({ rewards: [reward], target: 500000 });
  });
});
