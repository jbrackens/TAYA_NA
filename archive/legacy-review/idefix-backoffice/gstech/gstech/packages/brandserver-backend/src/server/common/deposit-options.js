/* @flow */
import type { CampaignReward } from 'gstech-core/modules/clients/campaignserver-api-types'
import type { Bonus, Journey } from "./api";
import type { DepositMethod } from './modules/deposit';
import type { CampaignDef } from './campaign';

const _ = require('lodash');
const { asyncForEach } = require('gstech-core/modules/utils');
const logger = require('gstech-core/modules/logger');
const campaignserverApi = require('gstech-core/modules/clients/campaignserver-api');
const { moneyFrom } = require('./money');
const { formatMoney } = require('./utils');
const { localize } = require('./modules/localize');

export type IconType = 'coins' | 'bounty' | 'reward' | 'freespin' | 'wheel';

type MappedCampaignReward = {
  limit: number,
  spintype?: ?string,
  spincount?: ?number,
  count?: number,
  limitAmount?: string,
  ...
}

export type FreespinOptions = {
  limit: number,
  limitAmount?: string,
  count?: number,
  spintype: ?string,
  spincount?: ?number,
  ...
};

export type CampaignOptions = {
  title: string,
  options: {
    id: string,
    toggle: 'on' | 'off' | 'disabled',
    icon: IconType,
    title: string,
    fields: {
      key: string,
      value: string,
    }[],
    minAmount: number,
    freespins?: FreespinOptions[],
    freespinsSeparator?: boolean,
    amounts?: number[],
  }[],
};

export type BonusOptions = {
  title: string,
  options: {
    id: string,
    bonusId: ?Id | string, // FIXME: temporarily it's possible to have string here
    toggle: 'on' | 'off' | 'disabled',
    icon: IconType,
    title: string | { text: string, required?: boolean },
    fields: {
      key: string,
      value: string,
    }[],
    minAmount: ?number,
    maxAmount: ?number,
    percentage: ?number,
    freespins?: FreespinOptions[],
    freespinsSeparator?: boolean,
    amounts?: number[],
  }[],
};

export type DepositOptions = {
  freespins?: FreespinOptions[],
  freespinsSeparator?: boolean,
  amounts?: number[],
  bonus?: BonusOptions,
  campaign?: CampaignOptions,
};


const hasLimit = (minAmount: Money, limit: ?{ limitLeft: ?Money, ... }) => {
  if (limit != null && limit.limitLeft) {
    return minAmount < limit.limitLeft;
  }
  return true;
};

const formatCampaignFreespins = async (campaigns: CampaignDef[], journey: Journey) => {
  const freespins =
    campaigns.length > 1
      ? _.compact<MappedCampaignReward>(
          await Promise.all(campaigns.map((x) => mapLegacyCampaignReward(journey, x))),
        )
      : undefined;
  const amounts = campaigns.length > 1 ?
    campaigns.map(x => moneyFrom(x.minimumdeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed()) : undefined;
  const freespinsSeparator = campaigns.length > 1 ? campaigns.every(x => x.maximumdeposit === campaigns[0].maximumdeposit) : undefined;

  return {
    freespins,
    amounts,
    freespinsSeparator,
  };
}

const formatRewardFreespins = async (rewards: CampaignReward[], journey: Journey) => {
  const freespins = rewards.length > 1 ?
    _.compact<MappedCampaignReward>(await Promise.all(rewards.map(x => mapCampaignReward(journey, x)))) : undefined;
  const amounts = rewards.length > 1 ?
    rewards.map(x => moneyFrom(x.minDeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed()) : undefined;
  const freespinsSeparator = rewards.length > 1 ? rewards.every(x => x.maxDeposit === rewards[0].maxDeposit) : undefined;

  return {
    freespins,
    amounts,
    freespinsSeparator,
  };
}

const getBonusOptions = async (
  req: express$Request,
  journey: Journey,
  limit: ?{ limitLeft: ?Money, ... },
  campaigns: Array<{
    campaignId: Id,
    campaignName: string,
    creditMultiple: boolean,
    rewards: Array<CampaignReward>,
  }>,
) => {
  const result: any[] = [];
  await asyncForEach(campaigns, async (campaign) => {
    await asyncForEach(campaign.rewards, async (reward) => {
      const bonus = _.find(journey.bonuses, (x: Bonus) => x.activeBonus === reward.reward.bonusCode);
      // Deposit bonuses are not actually handled as rewards, but as classic deposit bonuses
      // so it's gstech-backend actually deciding if it's ok to credit bonus or not - not campaignserver.
      // Client just passes bonusRuleID to gstech-backend on deposit, and bonus is credited if available.
      // When bonus is not available, also campaign is not shown - but deposits are not tracked in campaigns.
      // This is something to be improved hopefully.

      if (bonus) {
        const fields = [];
        if (bonus.wageringRequirement > 0) {
          fields.push({
            key: localize(req, 'my-account.deposit.wagering') || '',
            value: `${bonus.wageringRequirement}X`,
          });
        }
        fields.push({
          key: localize(req, 'my-account.deposit.maxbonus') || '',
          value: formatMoney(req, bonus.maxAmount, false),
        });

        result.push({
          id: String(campaign.campaignId),
          bonusId: bonus.id,
          toggle: !hasLimit(100 * (bonus.minAmount || 0), limit)
            ? 'disabled'
            : result.length === 0
            ? 'on'
            : 'off',
          icon: 'coins',
          title:
            (reward.titles[req.context.languageISO] && reward.titles[req.context.languageISO]) ||
            '',
          fields,
          minAmount: bonus.minAmount,
          maxAmount: bonus.maxAmount,
          percentage: bonus.percentage,
        });
      }
    });
  });
  // Legacy bonus campaigns
  const bonuses = journey.activeBonuses();
  await Promise.all(
    bonuses.map(async (bonus) => {
      const fields = [];
      if (bonus.wageringRequirement > 0) {
        fields.push({
          key: localize(req, 'my-account.deposit.wagering') || '',
          value: `${bonus.wageringRequirement}X`,
        });
      }
      const b = bonus.bonus;
      if (b) {
        fields.push({
          key: localize(req, 'my-account.deposit.maxbonus') || '',
          value: formatMoney(req, b.maxAmount, false),
        });
      }

      const campaigns = await journey.activeCampaigns([bonus.banner.id]);

      result.push({
        id: bonus.banner.id,
        bonusId: (bonus.bonus && bonus.bonus.id) || bonus.banner.id, // In case bonus is not there, use banner id for freespins
        toggle: !hasLimit(100 * ((bonus.bonus && bonus.bonus.minAmount) || 0), limit)
          ? 'disabled'
          : result.length === 0
          ? 'on'
          : 'off', // TODO get min amount for freespins
        icon: 'coins',
        title:
          (bonus.banner[req.context.languageISO] && bonus.banner[req.context.languageISO].text) ||
          '',
        fields,
        minAmount: bonus.bonus && bonus.bonus.minAmount,
        maxAmount: bonus.bonus && bonus.bonus.maxAmount,
        percentage: bonus.bonus && bonus.bonus.percentage,
        ...(await formatCampaignFreespins(campaigns, journey)),
      });
    }),
  );
  return result;
};

const mapCampaignType = (type: string): IconType => {
  switch (type) {
    case 'iron':
    case 'gold':
    case 'bonus':
    case 'depositBonus':
    case 'markka':
      return 'coins';
    case 'reward':
      return 'reward';
    case 'bounty':
      return 'bounty';
    case 'wheelSpin':
    case 'wheel':
      return 'wheel';
    default:
      return 'coins';
  }
};

const mapLegacyCampaignReward = async (journey: Journey, campaign: CampaignDef): Promise<?MappedCampaignReward> => {
  if (campaign.type === 'iron' || campaign.type === 'gold' || campaign.type === 'markka') {
    return {
      limit: moneyFrom(campaign.minimumdeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
      spintype: localize(journey.req, `coins.${campaign.type}`),
      spincount: Number(campaign.credit),
    };
  }

  if (campaign.type === 'wheel') {
    return {
      limit: moneyFrom(campaign.minimumdeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
      spincount: Number(campaign.credit),
    };
  }

  const reward = await journey.getReward(campaign.credit);
  if (reward) {
    return {
      limit: moneyFrom(campaign.minimumdeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
      spincount: reward.spins,
      spintype: localize(journey.req, `freespins.${reward.type}`),
    };
  }
};

const mapCampaignReward = async (journey: Journey, { quantity, minDeposit, reward }: CampaignReward): Promise<MappedCampaignReward> => {
  logger.debug('mapCampaignReward', reward);
  if (reward.creditType === 'iron' || reward.creditType === 'gold' || reward.creditType === 'markka') {
    return {
      limit: moneyFrom(minDeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
      spintype: localize(journey.req, `coins.${reward.creditType || 'normal'}`),
      spincount: quantity,
    };
  }

  if (reward.creditType === 'wheelSpin') {
    return {
      limit: moneyFrom(minDeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
      spincount: quantity,
    };
  }


  return {
    limit: moneyFrom(minDeposit, 'EUR').asCurrency(journey.req.context.currencyISO).asFixed(),
    spincount: reward.spins,
    spintype: localize(journey.req, `freespins.${reward.spinType || 'normal'}`),
  };
};


const getCampaignOptions = async (
  req: express$Request,
  journey: Journey,
  limit: ?{ limitLeft: ?Money, ... },
  legacyCampaigns: CampaignDef[],
  campaignsWithRewards: Array<{
    campaignId: Id,
    campaignName: string,
    creditMultiple: boolean,
    rewards: Array<CampaignReward>,
  }>,
) => {
  const result: any = [];
  await Promise.all(
    campaignsWithRewards.map(async (campaign) => {
      const rewards = campaign.rewards.filter((r) => r.wager > 0);
      const reward = _(rewards)
        .sortBy((x) => x.minDeposit)
        .first();
      if (reward) {
        const fields = [];
        fields.push({
          key: localize(req, 'my-account.deposit.wagering') || '',
          value: `${reward.wager}X`,
        });
        if (reward.minDeposit > 0) {
          const mindeposit = moneyFrom(reward.minDeposit, 'EUR')
            .asCurrency(req.context.currencyISO)
            .asFixed();
          fields.push({
            key: localize(req, 'my-account.deposit.mindeposit') || '',
            value: formatMoney(req, mindeposit, false),
          });
        }
        result.push({
          id: String(campaign.campaignId),
          toggle: !hasLimit(reward.minDeposit, limit)
            ? 'disabled'
            : result.length === 0
            ? 'on'
            : 'off',
          icon: mapCampaignType(reward.creditType),
          title:
            (reward.titles[req.context.languageISO] && reward.titles[req.context.languageISO]) ||
            '',
          fields,
          minAmount: reward.minDeposit,
          ...(await formatRewardFreespins(rewards, journey)),
        });
      }
    }),
  );
  return result;
};

const getDepositOptions = async (
  req: express$Request,
  journey: Journey,
  depositMethods: DepositMethod[],
  limit: ?{ limitLeft: ?Money, ... },
): Promise<DepositOptions> => {
  const campaignsWithRewards = await campaignserverApi.getPlayerCampaignsWithRewards(
    req.context.playerId,
  );

  const bCampaigns = campaignsWithRewards.filter((c) =>
    c.rewards.some((r) => r.reward && r.reward.creditType === 'depositBonus'),
  );
  const fCampaigns = campaignsWithRewards.filter((c) =>
    c.rewards.every((r) => r.reward && r.reward.creditType !== 'depositBonus'),
  );

  const bonus = await getBonusOptions(req, journey, limit, bCampaigns);

  const campaigns = await journey.activeCampaigns(); // TODO: this can be removed when jefe campaigns are migrated
  const campaign = await getCampaignOptions(req, journey, limit, campaigns, fCampaigns);

  const result: DepositOptions = {
    ...(await formatCampaignFreespins(campaigns, journey)),
    bonus:
      bonus.length > 0
        ? {
            title: localize(req, 'my-account.deposit.bonus-title') || '',
            options: bonus,
          }
        : undefined,
    campaign:
      campaign.length > 0
        ? {
            title: localize(req, 'my-account.deposit.campaign-title') || '',
            options: campaign,
          }
        : undefined,
  };
  return result;
};

module.exports = {
  getDepositOptions,
};
