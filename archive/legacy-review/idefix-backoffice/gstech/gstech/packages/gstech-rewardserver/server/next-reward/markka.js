/* @flow */
import type { RewardsAndTargetReturnType } from '../../types/EventData';

const targetBrackets = [
  { quantity: 5, target: 20000, avgBetSize: 0 },
  { quantity: 10, target: 40000, avgBetSize: 20 },
  { quantity: 25, target: 100000, avgBetSize: 40 },
  { quantity: 50, target: 200000, avgBetSize: 100 },
  { quantity: 100, target: 400000, avgBetSize: 200 },
  { quantity: 250, target: 1000000, avgBetSize: 400 },
  { quantity: 500, target: 2000000, avgBetSize: 800 },
  { quantity: 1000, target: 4000000, avgBetSize: 2000 },
  { quantity: 5000, target: 20000000, avgBetSize: 4000 },
];

const getMarkkaRewardAndTarget = async (pg: Knex, rewardDefinitionId: Id, playerId: Id): Promise<RewardsAndTargetReturnType> => {
  const previousProgress = await pg('progresses')
    .select('id', 'perRewardDefinitionCount')
    .where({ rewardDefinitionId, playerId })
    .orderBy('perRewardDefinitionCount', 'desc')
    .first();

  let arrayIndex = 0;
  let { target } = targetBrackets[0];
  const progressModifier: { contribution?: Money, multiplier?: number } = {};
  if (previousProgress) {
    const { avg } = await pg(pg.raw('game_progresses gp'))
      .select(pg.raw('coalesce(cast(sum(gp."betAmount") as decimal)/nullif(sum(gp."betCount"), 0), 0) as avg'))
      .where({ progressId: previousProgress.id })
      .first();

    for (let i = 0; i < targetBrackets.length - 1; i += 1) {
      const isPreLastIndex = i + 1 === targetBrackets.length - 1;
      const isWithinBrackets = targetBrackets[i].avgBetSize <= avg && targetBrackets[i + 1].avgBetSize > avg;
      if (isWithinBrackets || process.env.TEST_MODE === 'true') {
        arrayIndex = i;
        break;
      } else if (isPreLastIndex) {
        arrayIndex = i + 1;
        break;
      }
    }
    const isDoubleSpeed = (previousProgress.perRewardDefinitionCount + 1) % 5 === 3; // 3, 8, 13, 18 etc.
    target = isDoubleSpeed
      ? targetBrackets[arrayIndex].target / 2
      : targetBrackets[arrayIndex].target;
    progressModifier.multiplier = isDoubleSpeed ? 2 : 1;
  } else {
    // Start first progress with 50% filled target
    progressModifier.contribution = targetBrackets[0].target / 2;
  }

  const reward = await pg('rewards')
    .select('id')
    .where({ creditType: 'markka' })
    .first();
  const rewards = new Array<any>(targetBrackets[arrayIndex].quantity).fill(reward);

  return { rewards, target, progressModifier };
};

module.exports = getMarkkaRewardAndTarget;
