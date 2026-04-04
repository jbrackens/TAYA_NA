/* @flow */
import type { RewardRulesTrigger } from '../../types/common';

const logger = require('gstech-core/modules/logger');
const { createWageringRequirement } = require('gstech-core/modules/clients/backend-payment-api');
const { creditReward } = require('gstech-core/modules/clients/rewardserver-api');
const { Money: MoneyClass } = require('gstech-core/modules/money-class');

const { getRewardsToCredit } = require('../repository');

type CreditRewardsProps = {
  eventType: RewardRulesTrigger,
  externalPlayerId: Id,
  brandId: BrandId,
  username?: string,
  eventId: string,
  amount?: Money,
  transactionKey?: string,
  currencyId?: string,
  campaignIds?: Id[] | null,
  timestamp: Date,
};

const creditRewardsIfFeasible = async (
  knex: Knex,
  {
    externalPlayerId,
    eventType,
    brandId,
    username,
    eventId,
    amount,
    transactionKey,
    currencyId,
    campaignIds,
    timestamp,
  }: CreditRewardsProps,
): Promise<void> => {
   
  campaignIds = (eventType === 'deposit' || campaignIds) ? campaignIds || [] : null; // eslint-disable-line no-param-reassign

  const rewardsToCredit = await getRewardsToCredit(
    knex,
    externalPlayerId,
    eventType,
    campaignIds,
    amount,
    timestamp,
  );
  logger.debug('creditRewardsIfFeasible', username, eventType, amount, transactionKey, currencyId, rewardsToCredit);

  for (const reward of rewardsToCredit) {
    let completeCampaign = false;
    try {
      logger.debug('Credit campaign reward', externalPlayerId, reward);
      await creditReward(brandId, reward.rewardId, {
        playerId: externalPlayerId,
        externalLedgerId: `${reward.campaignId}-${eventId}`,
        count: reward.quantity,
        comment: `Campaign source: ${reward.campaignName}`,
        source: 'marketing',
        useOnCredit: reward.useOnCredit,
      });

      const wageringRequirement = MoneyClass.parse(reward.minDeposit * reward.wager, 'EUR').asCurrency(currencyId).asFixed();
      if (eventType === 'deposit' && transactionKey && currencyId && wageringRequirement > 0) {
        await createWageringRequirement(
          username || '',
          transactionKey,
          wageringRequirement,
        );
      }

      await knex('credited_rewards').insert({
        playerId: reward.playerId,
        rewardRulesId: reward.rewardRulesId,
        creditMultiple: reward.creditMultiple && eventType === 'deposit',
        campaignId: reward.campaignId,
      });
      if ((eventType === 'deposit' && !reward.creditMultiple) || eventType !== 'deposit')  {
        completeCampaign = true;
      }
    } catch (e) {
      logger.error(
        `Not able to credit reward ${reward.rewardId} for player ${externalPlayerId} and campaign ${reward.campaignId}`,
        e,
      );
    }
    if (completeCampaign) {
      await knex('campaigns_players')
        .where({ playerId: reward.playerId, campaignId: reward.campaignId })
        .update({ removedAt: new Date(), complete: true });
    }
  }
};

module.exports = {
  creditRewardsIfFeasible,
};
