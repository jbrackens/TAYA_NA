/* @flow */
const moment = require('moment-timezone');

const { createLedger, markLedgersUsed, getPlayerCoins } = require('./ledgers/Ledgers');
const { getShopItemReward } = require('./rewards/Rewards');

const exchangeCoinsForReward = async (knex: Knex, playerId: Id, rewardId: Id, brandId: BrandId): Promise<Id> => {
  const reward = await getShopItemReward(knex, rewardId);
  if (!reward) {
    return Promise.reject({
      httpCode: 403,
      message: `Reward ${rewardId} not found or cannot be exchanged to`,
    });
  }

  const coins = await getPlayerCoins(knex, brandId, playerId, reward.currency).forUpdate();
  if (reward.price > coins.length) {
    return Promise.reject({ httpCode: 403, message: `Player ${playerId} does not have enough coins to buy ${rewardId}` });
  }

  const usedCoins = await markLedgersUsed(knex, coins.slice(0, reward.price).map(coin => coin.ledgerId), playerId);
  if (usedCoins.length !== reward.price) {
    return Promise.reject({ httpCode: 409, message: 'Failed to use required amount of coins' });
  }

  const ledger = await createLedger(knex, {
    rewardId,
    playerId,
    creditDate: new Date(),
    rewardDefinitionId: reward.rewardDefinitionId,
    expires: reward.validity ? moment().add(reward.validity, 'hours').format() : null,
    source: 'exchange',
  });
  return Number(ledger.id);
};

module.exports = {
  exchangeCoinsForReward,
};
