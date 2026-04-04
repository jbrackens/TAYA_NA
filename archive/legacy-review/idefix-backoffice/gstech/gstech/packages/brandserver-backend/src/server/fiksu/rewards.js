/* @flow */
import type { Journey, Player, Request, Reward } from '../common/api';
import type { LegacyCreditType } from '../common/import-tools';

const logger = require('gstech-core/modules/logger');
const rewards = require('../common/modules/rewards');
const { mapReward } = require('../luckydino/import-tools');
const utils = require('../common/utils');
const localization = require('../common/localization');

export type RewardDefinition = {
  action: string,
  id: string,
  type: string,
  bonusCode: string,
  spins: number,
  game: string,
  credit: LegacyCreditType,
  mobile: boolean,
  description: string,
  thumbnail: ?string,
  cost: Money,
  tags: string[],
};

export type RewardCredit = {
  id: string,
  rewardid: string,
  used?: boolean,
};

export type ApiReward = {
  action: string,
  id: string,
  rewardid: string,
  thumbnail: string,
  type: string,
};

const addToUser = async (ids: RewardCredit[], player: Player) => {
  await Promise.all(ids.map(r =>
    rewards.creditReward('reward', {
      id: r.rewardid,
      externalId: r.id,
    }, player)
  ));
};

const getRewards = async (journey: Journey): Promise<ApiReward[]> => {
  const ledgers = await rewards.getRewards(journey.req, 'reward');
  return ledgers.map((rg) => {
    const { id, reward, game } = rg;
    const b2 = mapReward({ reward, game });
    const l = localization.localize(journey.req.context.languageISO)(`fiksurewards.${b2.type || ''}spins`, { count: `<strong>${b2.spins || ''}</strong><b>` }, { format: 'html' }) || '';
    const type = (b2.spins || 0) > 0 ? `${l}</b>` : '';
    const thumbnail = utils.populate(b2.thumbnail || '', {
      currency: journey.req.context.currencyISO.toLowerCase(),
    });
    return { type, thumbnail, id: String(id), action: b2.action, rewardid: reward.externalId };
  });
};

const rewardById = async (user: Player, id: string): Promise<Reward> => {
  const r = await rewards.getByExternalId(id);
  const mapped = mapReward(r);
  return {
    cost: mapped.cost,
    type: mapped.credit,
    spins: mapped.spins,
  }
};

const use = async (req: Request, id: string): Promise<RewardDefinition | false> => {
  const r = await rewards.use(req, Number(id));
  if (r.length > 0) {
    const result = mapReward(r[0]);
    logger.debug('useReward', id, req.user.username, r, result);
    return result;
  }
  return false;
};

module.exports = {
  use,
  addToUser,
  rewardById,
  getRewards,
};