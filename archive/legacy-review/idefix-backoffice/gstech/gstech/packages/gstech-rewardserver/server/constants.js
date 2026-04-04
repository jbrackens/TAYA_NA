/* @flow */
import type {
  CreditType,
} from 'gstech-core/modules/types/rewards';

const creditTypes: CreditType[] = [
  'freeSpins',
  'real',
  'bonus',
  'depositBonus',
  'physical',
  'wheelSpin',
  'markka',
  'iron',
  'gold',
  'lootBox',
];

module.exports = {
  creditTypes,
};
