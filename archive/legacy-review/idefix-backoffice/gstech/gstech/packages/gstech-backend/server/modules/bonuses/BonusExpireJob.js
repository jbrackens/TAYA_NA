/* @flow */
const Bonus = require('./Bonus');

const update = async () => {
  const bonuses = await Bonus.getExpiredBonuses();
  for (const bonus of bonuses) {
    await Bonus.expireBonus(bonus.id);
  }
};

module.exports = { update };
