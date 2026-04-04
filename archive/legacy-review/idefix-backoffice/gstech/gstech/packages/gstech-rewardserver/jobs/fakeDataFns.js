/* @flow */
const pg = require('gstech-core/modules/pg');
const { upsertReward } = require('../server/modules/rewards/Rewards');
const {
  getRewardDefinition,
  createRewardDefinition,
} = require('../server/modules/reward-definitions/RewardDefinitions');
const truncateTables = require('./cleanData');
const { rewardDefinitions } = require('../server/modules/reward-definitions/definitions');
const { games } = require('../server/mockData');

const insertWheelSpinRewards = async () => {
  const definition = await getRewardDefinition(pg, 'CJ', 'wheelSpin');

  await upsertReward(pg, {
    rewardDefinitionId: definition && definition.id,
    creditType: 'wheelSpin',
    bonusCode: '',
    description: '',
    externalId: 'WS',
    order: 1,
  });
};

const insertMarkkaReward = async () => {
  const definition = await getRewardDefinition(pg, 'KK', 'markka');

  await upsertReward(pg, {
    rewardDefinitionId: definition && definition.id,
    creditType: 'markka',
    bonusCode: '',
    description: '',
    externalId: 'Markka',
    order: 2,
  });
};

const insertKKShopItems = async () => {
  const definition = await getRewardDefinition(pg, 'KK', 'shopItemV2');

  const prices = [10, 25, 100, 1000, 5000];
  await Promise.all(prices.map(price => (
    upsertReward(pg, {
      rewardDefinitionId: definition && definition.id,
      creditType: 'lootBox',
      bonusCode: `KKLootBox_${price}`,
      description: `KKLootBox_${price}`,
      externalId: `KKLootBox_${price}`,
      order: 1,
      price,
      currency: 'markka',
    })
  )));

  const cashRewardValues = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  await Promise.all(cashRewardValues.map(cashRewardValue => (
    upsertReward(pg, {
      rewardDefinitionId: definition && definition.id,
      creditType: 'real',
      bonusCode: `KKShopRealMoney_${cashRewardValue}`,
      description: `KKShopRealMoney_${cashRewardValue}`,
      externalId: `KKShopRealMoney_${cashRewardValue}`,
      order: 2,
      cost: cashRewardValue * 100,
      price: 2.5 * cashRewardValue,
      currency: 'markka',
    })
  )));
};

const insertKKLootBoxesRewards = async () => {
  const definition = await getRewardDefinition(pg, 'KK', 'lootBoxContent');
  await pg('games').insert(games);
  await pg.raw("select setval('games_id_seq', 10)");

  const rewardsValues = [50, 100, 200, 500, 1000, 2000];
  const spinsAmount = [5, 10];
  const data = [];
  rewardsValues.map(cost => spinsAmount.map(spins => games.map(game => (
    data.push({
      cost,
      spins,
      spinValue: cost / spins,
      gameId: game.id,
    })
  ))));

  await Promise.all(data.map(d => (
    upsertReward(pg, {
      rewardDefinitionId: definition && definition.id,
      creditType: 'freeSpins',
      bonusCode: '',
      description: '',
      externalId: `KKLootBoxReward_${d.cost}_${d.spins}_${d.spinValue}_${d.gameId}`,
      order: 1,
      ...d,
    })
  )));

  const cashRewardValues = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
  await Promise.all(cashRewardValues.map(cashRewardValue => (
    upsertReward(pg, {
      rewardDefinitionId: definition && definition.id,
      creditType: 'real',
      bonusCode: '',
      description: '',
      externalId: `KKRealMoney_${cashRewardValue}`,
      order: 2,
      cost: cashRewardValue,
    })
  )));
};

const insertRewardDefinitions = async () => {
  await Promise.all(
    Object.keys(rewardDefinitions).map((brandId) =>
      Promise.all(
        rewardDefinitions[brandId].map((rewardType) =>
          createRewardDefinition(pg, {
            brandId,
            promotion: rewardType.promotion || '',
            rewardType: rewardType.type,
            internal: !!rewardType.internal,
          }),
        ),
      ),
    ),
  );
};

module.exports = {
  truncateTables,
  insertRewardDefinitions,
  insertWheelSpinRewards,
  insertMarkkaReward,
  insertKKShopItems,
  insertKKLootBoxesRewards
};
