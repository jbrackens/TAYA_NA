/* @flow */
import type { CreditType } from 'gstech-core/modules/types/rewards';

const logger = require('gstech-core/modules/logger');

export type LegacyCreditType =
  | 'freespins'
  | 'bonus'
  | 'deposit-bonus'
  | 'cash'
  | 'grandejackpot'
  | 'tinyjackpot'
  | 'minijackpot';

const mapLegacyCreditType = (type: CreditType): LegacyCreditType => {
  switch(type) {
    case 'freeSpins':
      return 'freespins';
    case 'depositBonus':
      return 'deposit-bonus';
    case 'real':
      return 'cash';
    case 'bonus':
      return 'bonus';
    default:
      logger.error('Invalid legacy credit type', type);
      return 'freespins';
  }
};

module.exports = { mapLegacyCreditType };