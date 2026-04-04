/* @flow */
import type { GameWithThumbnail, RewardWithGame } from 'gstech-core/modules/types/rewards';
import type { Journey, Player } from '../common/api';
import type { BountyDefinition } from './import-tools';

const moment = require('moment-timezone');
const _ = require('lodash');
const client = require('gstech-core/modules/clients/rewardserver-api');
const { mapLegacyCreditType } = require('../common/import-tools');
const configuration = require('../common/configuration');
const rewards = require('../common/modules/rewards');
const { mapBounty, getRewardTags } = require('./import-tools');
const logger = require('../common/logger');

export type BountyCredit = {
  id: string,
  bountyid: string,
  crediting?: 'instant' | 'nextday12cet' | '2ndday12cet',
};
export type Bounty = { bountyid: string, id: string };

const bountyCurrency = (currency: string) => {
  if (currency === 'CAD' || currency === 'NZD') {
    return 'usd';
  }
  return currency.toLowerCase();
};

const addBounty = async (ids: BountyCredit[], player: Player) => {
  await Promise.all(ids.map(r =>
    rewards.creditReward('bounty', {
      id: r.bountyid,
      externalId: r.id,
    }, player)
  ));
};

const addSpin = async (player: Player, id: string) => {
  await rewards.creditReward('wheelSpin', {
    id: 'WheelSpin',
    externalId: id,
  }, player)
};

const checkTag = (tags: string[], k: string) => {
  for (const key of Array.from(k.split('|'))) {
    if (key[0] === '!' ? !_.includes(tags, key.substring(1)) : _.includes(tags, key)) {
      return true;
    }
  }
  return false;
};

const matchTag = (journey: Journey) => (b: RewardWithGame) => {
  const tags = [`level-${journey.level()}`];
  for (const tag of getRewardTags(b.reward)) {
    if (!checkTag(tags, tag)) {
      return false;
    }
  }
  return true;
};

// This is only used for level bounties anymore. Should be removed when those have been migrated to campaignserver. Deposit bounties still use this :(
const getMatchingBounties = async (journey: Journey, predicate: RewardWithGame => boolean): Promise<Array<RewardWithGame>> => {
  const bounties = await client.getAvailableRewards(configuration.shortBrandId(), { rewardType: 'otherBounty' })
  return bounties
    .filter(matchTag(journey))
    .filter(predicate);
};

const currentMonthDepositBonusId = () => `deposit-bonus-${moment().format('YYYYMM')}`;

const findCurrentBonusBounties = async (journey: Journey): Promise<Array<RewardWithGame>> => {
  const existingBounty = await client.getAllPlayerLedgers(journey.req.context.playerId, {
    externalId: currentMonthDepositBonusId(),
    group: 'bounty',
    brandId: configuration.shortBrandId(),
  });
  if (existingBounty.ledgers.length === 0) {
    const bounties = await getMatchingBounties(journey, x => x.reward.creditType === 'depositBonus');
    return bounties;
  }
  return [];
}


const getWheelCount = async (journey: Journey): Promise<number> => {
  const progresses = await rewards.getProgresses(journey.req);
  const progress = await rewards.progressForRewardType(progresses, 'wheelSpin');
  if (progress) {
    return progress.ledgers;
  }
  return 0;
};

const getBounties = async (journey: Journey): Promise<Array<{ type: string, id: Id | string, bountyid: string, bounty_image: string, action: string }>> => {
  const ledgers = await rewards.getRewards(journey.req, 'bounty');

  const mappedLedgers = ledgers
    .map(({ id, game, reward }) => ({
      id,
      type: mapLegacyCreditType(reward.creditType),
      bountyid: reward.externalId,
      bounty_image: reward.creditType === 'freeSpins' ? reward.metadata.bounty : `${reward.metadata.bounty}_${bountyCurrency(journey.req.context.currencyISO)}`,
      action: reward.metadata.action || (game ? `/loggedin/game/${game.permalink}/` : undefined),
    }));

  const bonusBounties = await findCurrentBonusBounties(journey);
  const mappedDepositBounties = bonusBounties
    .map(({ reward }) => ({
      id: `deposit/${reward.externalId}`,
      type: mapLegacyCreditType(reward.creditType),
      bountyid: reward.externalId,
      bounty_image: `${reward.metadata.bounty}_${bountyCurrency(journey.req.context.currencyISO)}`,
      action: reward.metadata.action || '/loggedin/myaccount/deposit',
    }));
  return [...mappedLedgers, ...mappedDepositBounties];
};


const bountyById = async (user: Player, id: string): Promise<BountyDefinition> => {
  const r = await rewards.getByExternalId(id);
  return mapBounty(r);
};

const spinWheel = async (req: express$Request): Promise<{ id: ?string, game: ?GameWithThumbnail, bounty: ?BountyDefinition }> => {
  const r = await rewards.useWheelSpin(req);
  if (r.length === 0) {
    return {
      id: null,
      game: null,
      bounty: null,
    }
  }
  if (r[0].reward.creditType === 'cash') {
    await rewards.use(req, r[0].id);
  }
  const bounty = mapBounty(r[0]);
  logger.debug('spinWheel result', bounty);
  return {
    id: bounty.bounty,
    game: r[0].game,
    bounty,
  };
};

const getApiBounty = async (req: express$Request, id: string): Promise<{
  ...BountyDefinition,
  action: void | string,
  mobile: boolean,
}> => {
  const bounty = await bountyById(req.user, id);
  return {
    ...bounty,
    mobile: true,
    action: bounty.action || (bounty.game != null ? `/loggedin/game/${bounty.game}/` : undefined),
  };
};

const redeem = async (req: express$Request, id: string): Promise<false | { action: string, bountyId: string }> => {
  const r = await rewards.use(req, Number(id));
  if (r.length > 0) {
    const [{ game, reward }] = r;
    return {
      bountyId: reward.externalId,
      action: reward.metadata.action || (game != null ? `/loggedin/game/${game.permalink}/` : undefined),
    }
  }
  return false;
};

const redeemDepositBonus = async (journey: Journey, id: string): Promise<false | { action: string, bountyId: string }> => {
  const bounties = await getBounties(journey);
  const depositBonus = bounties.filter((x) => String(x.bountyid) === String(id));
  if (depositBonus.length > 0) {
    const externalId = currentMonthDepositBonusId();
    const credited = await rewards.creditReward('bounty', {
      id,
      externalId,
    }, journey.req.user);
    if (credited && credited.ledgers.length > 0) {
      await rewards.use(journey.req, credited.ledgers[0].id);
      return { action: '/loggedin/myaccount/deposit/', bountyId: externalId };
    }
  }
  return false;
};

module.exports = {
  getMatchingBounties,
  bounties: getBounties,
  wheel: getWheelCount,
  spinWheel,
  addToUser: addBounty,
  addSpinToUser: addSpin,
  bountyById,
  getApiBounty,
  redeem,
  redeemDepositBonus,
};
