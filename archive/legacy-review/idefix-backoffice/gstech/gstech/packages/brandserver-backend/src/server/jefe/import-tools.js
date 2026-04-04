/* @flow */
import type { RewardWithGame, LedgerWithRewardAndGame } from 'gstech-core/modules/types/rewards';
import type { LegacyCreditType } from '../common/import-tools';

export type BountyType = { bonusCode: string, type: LegacyCreditType, id: string };

const { mapLegacyCreditType } = require('../common/import-tools');

export type BountyDefinition = {
  id: string,
  ledgerId?: Id,
  bounty: string,
  type: LegacyCreditType,
  tags: ?string[],
  bonusCode: string,
  crediting: ?string,
  description: ?string,
  spins: number,
  game: string,
  mindeposit: ?Money,
  spintype: ?string,
  action: ?string,
  trigger: string,
  crediting: 'instant' | 'nextday12cet' | '2ndday12cet',
  cost: Money,
};

const getRewardTags = (reward: { metadata: { [key: string]: string }, ...}): string[] =>
  reward.metadata.tags != null && reward.metadata.tags !== '' ? reward.metadata.tags.split(',') : [];

const mapBounty = (r: RewardWithGame | LedgerWithRewardAndGame): BountyDefinition => {
  const { game, reward } = r;
  return {
    id: reward.externalId,
    ledgerId: (r: any).id,
    bounty: reward.metadata.bounty,
    type: mapLegacyCreditType(reward.creditType),
    tags: getRewardTags(reward),
    trigger: reward.metadata.trigger,
    mindeposit: reward.metadata.mindeposit,
    bonusCode: reward.bonusCode,
    crediting: reward.metadata.crediting || 'instant',
    description: reward.description,
    spins: reward.spins || 0,
    cost: reward.cost,
    game: game ? game.permalink : '',
    spintype: reward.spinType,
    action: reward.metadata.action,
  };
};

module.exports = { mapBounty, getRewardTags };
