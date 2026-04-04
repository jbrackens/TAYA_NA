/* @flow */
const {
  truncateTables,
  insertRewardDefinitions,
  insertWheelSpinRewards,
  insertMarkkaReward,
  insertKKShopItems,
  insertKKLootBoxesRewards
} = require('./fakeDataFns')

module.exports = async () => {
  await truncateTables();
  await insertRewardDefinitions();
  await insertWheelSpinRewards();
  await insertMarkkaReward();
  await insertKKShopItems();
  await insertKKLootBoxesRewards();
};