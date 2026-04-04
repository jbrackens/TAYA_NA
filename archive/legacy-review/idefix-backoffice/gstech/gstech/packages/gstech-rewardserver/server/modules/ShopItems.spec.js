/* @flow */
const pg = require('gstech-core/modules/pg');

const { createRewardDefinition } = require('./reward-definitions/RewardDefinitions');
const { createLedger } = require('./ledgers/Ledgers');
const { upsertReward } = require('./rewards/Rewards');
const { exchangeCoinsForReward } = require('./ShopItems');
const cleanData = require('../../jobs/cleanData');
const { games } = require('../mockData');

const addCoinsToPlayer = async (playerId: Id, coinId: Id, amount: number = 1, rewardDefinitionId: Id) => {
  for (let i = 0; i < amount; i += 1) {
    await createLedger(pg, { playerId, rewardId: coinId, creditDate: new Date(), rewardDefinitionId, source: 'wagering' });
  }
};

describe('exchangeCoinsForReward', () => {
  let markkaId;
  let markkaDefinitionId;
  let rewardId;
  let rewardDefinitionId;

  before(async () => {
    await pg('games').insert(games[0]);
    rewardDefinitionId = (await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'reward' })).id;
    markkaDefinitionId = (await createRewardDefinition(pg, { brandId: 'KK', rewardType: 'markka' })).id;
    rewardId = (await upsertReward(pg, {
      rewardDefinitionId,
      bonusCode: '',
      gameId: games[0].id,
      creditType: 'freeSpins',
      description: '',
      externalId: 'FS',
      order: 1,
      price: 5,
      spins: 10,
      currency: 'markka',
    })).id;
    markkaId = (await upsertReward(pg, {
      rewardDefinitionId: markkaDefinitionId,
      bonusCode: '',
      creditType: 'markka',
      description: '',
      externalId: 'Markka',
      order: 2,
    })).id;
  });

  after(cleanData);

  it('throws error if reward not found', async () => {
    await expect(exchangeCoinsForReward(pg, 5, 61216123, 'KK'))
      .to.be.rejectedWith('Reward 61216123 not found');
  });

  it('throws error if player cannot afford the reward', async () => {
    await expect(exchangeCoinsForReward(pg, 5, rewardId, 'KK'))
      .to.be.rejectedWith(`Player 5 does not have enough coins to buy ${rewardId}`);
  });

  it('allow player to buy item if has enough markkas', async () => {
    await addCoinsToPlayer(5, markkaId, 5, markkaDefinitionId);

    const ledgerId = await exchangeCoinsForReward(pg, 5, rewardId, 'KK');

    expect(ledgerId).to.be.a('number');
  });
});
