// @flow
import type {
  AudienceRuleDraft,
  CampaignDraft,
  RewardRuleDraft,
} from "../../types/common";

const logger = require('gstech-core/modules/logger');
const pg = require('gstech-core/modules/pg');
const { upsert2 } = require('gstech-core/modules/knex');
const sheets = require('gstech-core/modules/sheets');
const { getAvailableRewards } = require('gstech-core/modules/clients/rewardserver-api');

const config = require('../config');
const { upsertCampaign, createRewardRules } = require('../modules/Campaigns/repository');
const { upsertCampaignContent } = require('../modules/Campaigns/CampaignContent/repository');
const { createAudienceRules } = require('../modules/Campaigns/AudienceRule/repository');

// TODO: Update that with real values
const segmentMap = {
  '1': ['segment'],
};

const importKKCampaigns = async () => {
  const errors = [];
  const availableRewards = await getAvailableRewards('KK', { rewardType: 'markka' });
  const markkaRewardId = availableRewards[0].reward.id;
  if (!markkaRewardId) {
    throw new Error('Markka reward not available');
  }

  const [mailers] = await sheets.openSheets(
    ((config.sheets.KK.campaigns: any): string), // FIXME: KK.campaigns happened to be optional
    ['Mailers'],
    config.google.api,
  );

  const contentTypes: { [string]: any } = {};
  await Promise.all(
    ['email', 'sms', 'notification'].map((type) =>
      upsert2(pg, 'content_type', { type, brandId: 'KK' }, ['type', 'brandId']).then(
        ({ id }) => {
          contentTypes[type] = id;
        },
      )
    ),
  );

  const previousCampaigns: { [string]: Id } = {};
  for (const row of mailers) {
    const campaignDraft: CampaignDraft = {
      name: row.campaignid,
      brandId: 'KK',
      creditMultiple: false,
      status: 'draft',
      audienceType: 'static',
    };
    try {
      await pg.transaction(async (tx) => {
        const { id: campaignId } = await upsertCampaign(tx, campaignDraft);

        // eslint-disable-next-line no-unused-vars
        const [campaign, time, segment] = row.campaignid.split('-');
        const nextCampaignName = `${campaign}-${row.timeincampaign}${segment ? `-${segment}` : ''}`;
        previousCampaigns[nextCampaignName] = campaignId;

        // Audience Rules
        const audienceRules: AudienceRuleDraft[] = [
          { name: 'numDeposits', operator: '=', values: 1 },
        ];
        audienceRules.push({
          name: 'segments',
          operator: 'in',
          // TODO: 1 -> row.segment
          values: segmentMap['1'],
        });
        if (previousCampaigns[row.campaignid]) {
          // Complete member of campaigns
          audienceRules.push({
            name: '',
            operator: 'otherCampaignsMember',
            values: { campaignIds: [previousCampaigns[row.campaignid]], complete: true },
          });
        }
        if (row.timeincampaign) {
          const isHours = row.timeincampaign.search('h') !== -1;
          const minutes =
            Number(row.timeincampaign.replace(/[^\d]/g, '')) * (isHours ? 60 : 24 * 60);
          audienceRules.push({
            name: 'addedToCampaign',
            operator: 'withinMinutes',
            values: minutes,
            not: true,
          });
        }
        await tx('audience_rules').where({ campaignId }).del();
        await createAudienceRules(tx, audienceRules, campaignId);

        // Reward Rules
        const rewards: RewardRuleDraft[] = [];
        if (row.loginmk) {
          rewards.push({
            trigger: 'login',
            minDeposit: row.mindeposit,
            rewardId: markkaRewardId,
            wager: 5,
            useOnCredit: false,
            quantity: row.loginmk,
            titles: {
              fi: { text: row.header },
            },
          });
        }
        if (row.depositmk) {
          rewards.push({
            trigger: 'deposit',
            minDeposit: row.mindeposit,
            rewardId: markkaRewardId,
            wager: 5,
            useOnCredit: false,
            quantity: row.depositmk,
            titles: {
              fi: { text: row.header },
            },
          });
        }
        await tx('reward_rules').where({ campaignId }).del();
        await createRewardRules(tx, rewards, campaignId);

        // Connect content to campaign
        const contentName = `KK-v2-${row.campaignid}`;
        const content = await tx('content')
          .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
          .select('content.id')
          .where({ name: contentName, brandId: 'KK' });
        if (!content.length) {
          throw new Error(`Couldn't find content ${contentName}`);
        }

        return Promise.all(
          content.map((c) => upsertCampaignContent(tx, campaignId, { contentId: c.id })),
        );
      });
    } catch (e) {
      errors.push(e.message || e);
    }
  }

  if (errors.length) {
    logger.error(JSON.stringify(errors, null, 2));
  } else {
    logger.info(`Campaigns import finished sucessfully`);
  }
};

module.exports = async () => {
  logger.info('importKKCampaigns started...');

  await importKKCampaigns();

  logger.info('importKKCampaigns finished.');
};
