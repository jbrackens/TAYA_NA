// @flow
import type { GetPlayerCampaignsResponse } from 'gstech-core/modules/clients/campaignserver-api-types';
import type { GetCampaignsWithRewards } from '../../../types/api';
import type {
  AudienceType,
  Campaign,
  CampaignDraft,
  CampaignStats,
  CampaignStatus,
  CampaignUpdate,
  CampaignWithAudienceRules,
  CompleteCampaign,
  PlayerCampaignsWithRewards,
  RewardRule,
  RewardRuleDraft,
} from '../../../types/common';
import type { CampaignsList } from '../../../types/repository';
import type { Player } from '../Players/repository';

const _ = require('lodash');
const moment = require('moment-timezone');

const logger = require('gstech-core/modules/logger');
const { upsert2 } = require('gstech-core/modules/knex');

const { creditRewardsIfFeasible } = require('../../event-handlers/rewardHandlers');
const config = require('../../config');
const { CAMPAIGN_STATUSES } = require('../../constants');
const AudienceBuilder = require('./AudienceRule/AudienceBuilder');
const { mapMinutesFrom } = require('./AudienceRule/utils');
const { addCampaignTimeAndStatusCheck, asyncForEach } = require('../../utils');
const { lazyNotificationEventTriggerProducer } = require('../../producer');
const { getCampaignContent } = require('./CampaignContent/repository');
const { createCSVString } = require('../../utils');
const { elegibleForSms } = require('../Smses/utils');
const { elegibleForEmail } = require('../Emails/utils');

const archiveCampaign = async (pg: Knex, campaign: { name: string, id: Id, ... }): Promise<any> =>
  pg.transaction(async (tx) => {
    // eslint-disable-next-line no-use-before-define
    const groupId = await createGroup(tx, campaign.name);
    // eslint-disable-next-line no-use-before-define
    return updateCampaign(tx, campaign.id, { groupId, status: 'archived' });
  });

const connectPlayersWithCampaign = async (
  knex: Knex,
  playersQuery: Knex$QueryBuilder<Player>,
  campaignId: Id,
): Promise<void> =>
  knex.raw(
    `insert into campaigns_players ("playerId", "campaignId")
     select sub_players.id, ?
     from ? as sub_players
     where not exists (select "playerId" from campaigns_players where "campaignId" = ? and sub_players.id = campaigns_players."playerId")`,
    [campaignId, playersQuery, campaignId],
  );

const createCampaign = async (knex: Knex, campaignDraft: CampaignDraft): Promise<Id> => {
  try {
    return await knex.transaction(async tx => {
      let { groupId } = campaignDraft;
      if (!groupId) {
        [{ id: groupId }] = await tx('campaign_groups')
          .insert({ name: campaignDraft.name })
          .returning('id');
      }

      const [{ id: campaignId }] = await tx('campaigns')
        .insert({ ...campaignDraft, groupId })
        .returning('id');

      return campaignId;
    });
  } catch (e) {
    if (e.message.includes('campaigns_name_brand_id')) {
      return Promise.reject({
        httpCode: 409,
        message: `Campaign with name "${campaignDraft.name}" already exists`,
      });
    }

    if (e.constraint === 'campaigns_groupId_fkey') {
      return Promise.reject({
        httpCode: 409,
        message: `Group id ${campaignDraft.groupId || ''} does not exist`,
      });
    }

    logger.error('Campaign creation failed: ', e);
    return Promise.reject({ httpCode: 400, message: 'Not able to create campaign' });
  }
};

const createRewardRules = async (
  knex: Knex,
  rewardRules: RewardRuleDraft[],
  campaignId: Id,
): Promise<Id[]> =>
  knex('reward_rules')
    .insert(
      rewardRules.map(({ titles, ...rewardRule }) => ({
        titles: JSON.stringify(titles),
        campaignId,
        ...rewardRule,
      })),
    )
    .returning('id')
    .then((ids) => ids.map(({ id }) => id));

const deleteRewardRule = async (knex: Knex, rewardRulesId: Id): Promise<mixed> =>
  knex('reward_rules')
    .where({ id: rewardRulesId })
    .update({ removedAt: new Date() });

const duplicateCampaign = async (knex: Knex, campaignId: Id, groupId?: Id): Promise<Id> => {
  try {
    return await knex.transaction(async (tx) => {
      // Duplicate campaign
      const [{ id: duplicatedCampaignId }] = await tx('campaigns')
        .where({ id: campaignId })
        .first()
        .then(async ({ id, name, ...campaign }) => {  
          const newName = `Copy of ${name}`;
          let newGroupId = groupId;
          if (!newGroupId) {
            [{ id: newGroupId }] = await tx('campaign_groups')
              .insert({ name: newName })
              .returning('id');
          }
          return tx('campaigns').insert({ ...campaign, status: 'draft', name: newName, groupId: newGroupId }, ['id']);
        });

      // Duplicate audience rules
      await tx('audience_rules')
        .where({ campaignId })
        .then((rows) =>
          rows.length
            ? tx('audience_rules').insert(
                rows.map(({ id, values, ...rest }) => ({  
                  ...rest,
                  values: JSON.stringify(values),
                  campaignId: duplicatedCampaignId,
                })),
              )
            : null,
        );

      // Duplicate campaign content
      await tx('campaigns_content')
        .where({ campaignId })
        .then((rows) =>
          rows.length
            ? tx('campaigns_content').insert(
                rows.map(({ id, ...rest }) => ({ ...rest, campaignId: duplicatedCampaignId })),  
              )
            : null,
        );

      // Duplicate reward rules
      await tx('reward_rules')
        .where({ campaignId })
        .then((rows) =>
          rows.length
            ? tx('reward_rules').insert(
                rows.map(({ id, ...rest }) => ({ ...rest, campaignId: duplicatedCampaignId })),  
              )
            : null,
        );

      return duplicatedCampaignId;
    });
  } catch (e) {
    logger.error('duplicateCampaign error', e);
    if (e.constraint === 'campaigns_name_brand_id') {
      return Promise.reject({ httpCode: 400, message: `Campaign with the same name already exists` });
    }
    return Promise.reject({ httpCode: 400, message: 'Duplicating campaign failed' });
  }
};

const getCampaign = async (knex: Knex, campaignId: Id): Promise<Campaign> =>
  knex('campaigns')
    .where({ id: campaignId })
    .first();

const getCampaignPlayersForSendingCorrespondence = (
  knex: Knex,
  campaignId: Id,
  contentInfo: { type: string, subtype: string, sendToAll: boolean, ... },
): Knex$QueryBuilder<{}> =>
  knex('campaigns_players')
    .leftJoin('players', 'campaigns_players.playerId', 'players.id')
    .leftJoin('countries', 'countries.id', 'players.countryId')
    .leftJoin('subscription_options', 'subscription_options.id', 'players.subscriptionOptionsId')
    .leftJoin(
      knex('campaigns_players')
        .select(
          'playerId', 'campaignId',
          knex.raw('count(*) filter ( where "emailSentAt"::date = now()::date ) as "emailsReceivedToday"'),
          knex.raw('count(*) filter ( where "smsSentAt"::date = now()::date ) as "smsesReceivedToday"'),
        )
        .groupBy('playerId', 'campaignId')
        .as('sent_count'),
      {
        'sent_count.playerId': 'campaigns_players.playerId',
        'sent_count.campaignId': 'campaigns_players.campaignId',
      }
    )
    .leftJoin(
      knex('deposits')
        .select(knex.raw('campaigns_deposits."campaignId" as "depositCampaignId"'), 'externalPlayerId')
        .innerJoin('campaigns_deposits', 'campaigns_deposits.depositId', 'deposits.id')
        .where({ campaignId })
        .as('player_deposits'),
      {
        'player_deposits.externalPlayerId': 'players.externalId',
        'player_deposits.depositCampaignId': 'campaigns_players.campaignId',
      }
    )
    .select(
      'campaigns_players.id as campaignPlayerId',
      'players.id',
      'players.currencyId',
      'players.languageId',
      'players.firstName',
      'players.email',
      'players.mobilePhone',
      'players.brandId',
    )
    .where({
      'campaigns_players.campaignId': campaignId,
      gamblingProblem: false,
      potentialGamblingProblem: false,
      'countries.blocked': false,
      'campaigns_players.removedAt': null,
    })
    .whereRaw("not players.segments \\?| array ['selfexcluded', 'limit']")
    .modify((qb) => {
      if (contentInfo.type === 'email') {
        qb.where({ emailSentAt: null });

        if (!contentInfo.sendToAll) {
          qb.where({
            allowEmailPromotions: true,
            invalidEmail: false,
            'sent_count.emailsReceivedToday': 0,
            'player_deposits.externalPlayerId': null,
          })
            .andWhere((qb) =>
              qb
                .where({ emails: 'all' })
                .modify((qb) =>
                  ['best_offer', 'new_and_best'].includes(contentInfo.subtype)
                    ? qb.orWhere('emails', 'best_offers')
                    : qb,
                )
                .modify((qb) =>
                  ['new_game', 'new_and_best'].includes(contentInfo.subtype)
                    ? qb.orWhere('emails', 'new_games')
                    : qb,
                ),
            )
            .andWhere((qb) =>
              qb.where({ snoozeEmailsUntil: null }).orWhere('snoozeEmailsUntil', '<', new Date()),
            );
        }
      }
    })
    .modify((qb) => {
      if (contentInfo.type === 'sms') {
        qb.where({ smsSentAt: null });

        if (!contentInfo.sendToAll) {
          qb.where({
            allowSMSPromotions: true,
            invalidMobilePhone: false,
            'sent_count.smsesReceivedToday': 0,
            'player_deposits.externalPlayerId': null,
          })
            .andWhere((qb) =>
              qb
                .where({ smses: 'all' })
                .modify((qb) =>
                  ['best_offer', 'new_and_best'].includes(contentInfo.subtype)
                    ? qb.orWhere('smses', 'best_offers')
                    : qb,
                )
                .modify((qb) =>
                  ['new_game', 'new_and_best'].includes(contentInfo.subtype)
                    ? qb.orWhere('smses', 'new_games')
                    : qb,
                ),
            )
            .andWhere((qb) =>
              qb.where({ snoozeSmsesUntil: null }).orWhere('snoozeSmsesUntil', '<', new Date()),
            );
        }
      }
    });

const getCampaignRewardRules = async (knex: Knex, campaignId: Id, trigger?: string): Promise<RewardRule[]> =>
  knex('reward_rules')
    .where({ campaignId, removedAt: null })
    .modify(qb => trigger ? qb.where({ trigger }) : qb);

const getCampaigns = async (
  knex: Knex,
  campaignStatuses?: CampaignStatus[],
  brandId?: BrandId,
  { pageSize, pageIndex }: { pageSize?: number, pageIndex: number } = {
    pageSize: 10,
    pageIndex: 1,
  },
): Promise<CampaignsList> => {
  if (campaignStatuses && !campaignStatuses.every((s) => CAMPAIGN_STATUSES.includes(s))) {
    return { groups: [] };
  }

  const query = knex
    .with(
      'ordered_campaigns',
      knex('campaigns')
        .select('campaigns.*', knex.raw('0 as reactions'), knex.raw('0 as audience'))
        .modify((qb) => (campaignStatuses ? qb.whereIn('status', campaignStatuses) : qb))
        .modify((qb) => (brandId ? qb.where({ brandId }) : qb))
        .orderByRaw('"startTime" desc nulls last')
        .orderByRaw('"endTime" desc nulls last')
        .orderBy('campaigns.id', 'desc'),
    )
    .from('ordered_campaigns')
    .leftJoin('campaign_groups', 'campaign_groups.id', 'ordered_campaigns.groupId')
    .select(
      'campaign_groups.name',
      'campaign_groups.id',
      knex.raw('min(ordered_campaigns."startTime") as "startTime"'),
      knex.raw('max(ordered_campaigns."endTime") as "endTime"'),
      knex.raw('json_agg(ordered_campaigns order by ordered_campaigns.id asc) as campaigns'),
    )
    .groupBy('campaign_groups.id')
    .orderBy('campaign_groups.id', 'desc')
    .as('groups');

  let campaigns;
  if (pageSize) {
    campaigns = await query
      .paginate({ perPage: pageSize, currentPage: pageIndex })
      .then(({ pagination: { perPage, currentPage, ...pagination }, data }) => ({
        groups: data,
        pagination: { pageSize: perPage, pageIndex: currentPage, ...pagination },
      }));
  } else {
    campaigns = await query.then((c) => ({ groups: c }));
  }

  return campaigns;

  // return knex('campaigns')
  //   .select('audience.*', 'reactions.reactions')
  //   .from(
  //     knex('campaigns')
  //       .select('campaigns.*', knex.raw('COUNT(campaigns_players.id) as audience'))
  //       .leftJoin('campaigns_players', function() {
  //         this.on('campaigns.id', 'campaigns_players.campaignId').onNull('campaigns_players.removedAt');
  //       })
  //       .modify(qb => (campaignStatuses ? qb.whereIn('status', campaignStatuses) : qb))
  //       .groupBy('campaigns.id')
  //       .as('audience'),
  //   )
  //   .join(
  //     knex('campaigns')
  //       .select('campaigns.id', knex.raw('COUNT(events.id) as reactions'))
  //       .leftJoin('campaigns_content', function() {
  //         this.on('campaigns.id', 'campaigns_content.campaignId').onNull('campaigns_content.removedAt');
  //       })
  //       .leftJoin('events', 'campaigns_content.id', 'events.campaignContentId')
  //       .modify(qb => (campaignStatuses ? qb.whereIn('status', campaignStatuses) : qb))
  //       .groupBy('campaigns.id')
  //       .as('reactions'),
  //     'audience.id',
  //     'reactions.id',
  //   )
  //   .orderBy('audience.id', 'asc');
};

const getCampaignStats = async (knex: Knex, campaignId: Id): Promise<CampaignStats> => {
  logger.debug('>>>> getCampaignStats', { campaignId });
  const contentEventsRaw = await knex
    .select(
      't1.type',
      't1.subtype',
      knex.raw(`array_agg(json_build_object(
        'id', t1.text,
        'value', t1.count
      )) as events`),
    )
    .from(
      knex('campaigns')
        .select(
          'content_type.type',
          'content.subtype',
          'events.text',
          knex.raw('cast(count(events.id) as integer) as count'),
        )
        .innerJoin('campaigns_content', 'campaigns_content.campaignId', 'campaigns.id')
        .innerJoin('content_type', 'content_type.id', 'campaigns_content.contentTypeId')
        .innerJoin('content', 'content.id', 'campaigns_content.contentId')
        .innerJoin('events', 'events.campaignContentId', 'campaigns_content.id')
        .where({ 'campaigns.id': campaignId })
        .whereIn('events.text', ['open', 'click', 'view'])
        .groupBy('content_type.type')
        .groupBy('events.text')
        .groupBy('content.subtype')
        .as('t1'),
    )
    .groupBy('t1.type')
    .groupBy('t1.subtype')
    .orderBy('t1.type')
    .debug();

  const contentEvents: any = _.keyBy(contentEventsRaw, 'type');
  const emailContent = _.chain((contentEvents.email || {}).events)
    .keyBy('id')
    .mapValues('value')
    .value();
  const notificationContent = _.chain((contentEvents.notification || {}).events)
    .keyBy('id')
    .mapValues('value')
    .value();

  const contentSent = await knex('campaigns')
    .first(
      knex.raw(
        'cast(count(campaigns_players.id) filter (where "emailSentAt" is not null) as integer) as emails',
      ),
      knex.raw(
        'cast(count(campaigns_players.id) filter (where "smsSentAt" is not null) as integer) as smses',
      ),
    )
    .innerJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .where({ 'campaigns.id': campaignId })
    .debug();

  const notification = [
    { id: 'view', name: 'View', value: notificationContent.view || 0 },
    { id: 'click', name: 'Click', value: notificationContent.click || 0 },
  ];

  const email = [
    { id: 'open', name: 'Open', value: emailContent.open || 0 },
    { id: 'click', name: 'Click', value: emailContent.click || 0 },
    { id: 'sent', name: 'Sent', value: contentSent.emails },
  ];

  const sms = [{ id: 'sent', name: 'Sent', value: contentSent.smses }];

  // Rewards
  const rewards = await knex('campaigns')
    .first(
      knex.raw('sum(deposits."convertedAmount")::numeric/100.0 as "depositsAmount"'),
      knex.raw('count(deposits.id)::integer as "depositsQuantity"'),
      knex.raw('count(distinct deposits."externalPlayerId")::integer as players'),
    )
    .innerJoin('campaigns_deposits', 'campaigns_deposits.campaignId', 'campaigns.id')
    .innerJoin('deposits', 'deposits.id', 'campaigns_deposits.depositId')
    .groupBy('campaigns.id')
    .where({ 'campaigns.id': campaignId })
    .debug();
  const reward: any = {
    general: [
      { id: 'deposits', name: 'Deposit count', value: rewards?.depositsQuantity || 0 },
      { id: 'total', name: 'Deposit amount', value: rewards?.depositsAmount || 0 },
      { id: 'players', name: 'Unique depositing players', value: rewards?.players || 0 },
    ],
  };
  const creditedRewards = await knex('campaigns')
    .select('rewardRulesId', knex.raw('count(distinct "playerId")::integer as players'))
    .innerJoin('credited_rewards', 'credited_rewards.campaignId', 'campaigns.id')
    .where({ 'campaigns.id': campaignId })
    .groupBy('credited_rewards.rewardRulesId')
    .debug();
  reward.rewards = creditedRewards.reduce((acc, curr) => {
    if (acc[curr.rewardRulesId] === undefined) acc[curr.rewardRulesId] = [];
    acc[curr.rewardRulesId].push({ id: 'players', name: 'Player count', value: curr.players });
    return acc;
  }, {});

  // Audience
  // eslint-disable-next-line no-use-before-define
  const { audienceRules, ...campaign } = await getCampaignWithAudienceRules(knex, campaignId);
  const ab = new AudienceBuilder(knex, campaign);
  await ab.parseRulesArray(audienceRules);
  const audienceQuery = await ab.getElegibleAudienceStats(
    contentEvents.email && contentEvents.email.subtype,
  );
  logger.info('+++++ audienceQuery', { audienceQuery });
  const audience = [
    { id: 'audience', name: 'Audience', value: audienceQuery.total },
    { id: 'emailAudience', name: 'Email audience', value: audienceQuery.email },
    { id: 'smsAudience', name: 'Sms audience', value: audienceQuery.sms },
  ];
  const { logins } = await knex('events')
    .first(knex.raw('count(distinct "playerId")::integer as logins'))
    .where({ text: 'login', campaignId });
  audience.push({ id: 'logins', name: 'Logins', value: logins });
  logger.debug('<<<<< getCampaignStats', { audience, notification, email, sms, reward });
  return { audience, notification, email, sms, reward };
};

const getCampaignsWithRewards = async (knex: Knex): Promise<GetCampaignsWithRewards> =>
  knex('campaigns')
    .joinRaw('left join reward_rules on reward_rules."campaignId" = campaigns.id and reward_rules."removedAt" is null')
    .select(
      'campaigns.id as campaignId',
      'campaigns.name',
      'campaigns.status',
      knex.raw(
        `coalesce(
          array_agg(reward_rules."rewardId") filter ( where reward_rules."rewardId" is not null ),
          '{}'
        ) as "rewardIds"`,
      ),
    )
    .groupBy('campaigns.id')
    .orderBy('campaigns.id');

const getCampaignWithAudienceRules = async (
  knex: Knex,
  campaignId: Id,
): Promise<CampaignWithAudienceRules> => {
  const [campaign] = await knex('campaigns')
    .select(
      'campaigns.*',
      knex('audience_rules')
        .select(
          knex.raw(`array_agg(json_build_object(
          'id', audience_rules.id,
          'name', audience_rules.name,
          'operator', audience_rules.operator,
          'values', audience_rules.values,
          'not', audience_rules.not
        ))`),
        )
        .where({ campaignId })
        .as('audienceRules'),
    )
    .where({ id: campaignId });

  if (campaign) {
    if (!campaign.audienceRules) {
      campaign.audienceRules = [];
    } else {
      campaign.audienceRules = campaign.audienceRules.map(mapMinutesFrom);
    }
  }
  return campaign;
};

const getCompleteCampaign = async (knex: Knex, campaignId: Id): Promise<CompleteCampaign> => {
  let [campaign] = await knex('campaigns')
    .select(
      'campaigns.*',
      knex.raw(`json_build_object(
        'rules', coalesce(t1.audience_rules, '{}')
      ) as audience`),
      knex.raw(`json_build_object(
        'rewards', coalesce(t2.rewards, '{}')
      ) as reward`),
      't3.email',
      't4.sms',
      't5.notification',
      't6.banner',
      knex.raw(`json_build_object(
        'name', t7.name,
        'campaigns', t7.campaigns
      ) as group`)
    )
    .leftJoin(
      knex('audience_rules')
        .select(
          'campaignId',
          knex.raw(`array_agg(json_build_object(
              'id', audience_rules.id,
              'name', audience_rules.name,
              'operator', audience_rules.operator,
              'values', audience_rules.values,
              'not', audience_rules.not
            )) as audience_rules`),
        )
        .groupBy('campaignId')
        .as('t1'),
      't1.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('reward_rules')
        .select(
          'campaignId',
          knex.raw(`array_agg(json_build_object(
            'id', reward_rules.id,
            'trigger', reward_rules.trigger,
            'minDeposit', reward_rules."minDeposit",
            'maxDeposit', reward_rules."maxDeposit",
            'rewardId', reward_rules."rewardId",
            'wager', reward_rules.wager,
            'quantity', reward_rules.quantity,
            'titles', reward_rules.titles,
            'useOnCredit', reward_rules."useOnCredit"
          )) as rewards`),
        )
        .where({ removedAt: null })
        .groupBy('campaignId')
        .as('t2'),
      't2.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('campaigns_content')
        .select(
          'campaignId',
          knex.raw(`json_build_object(
            'emailId', campaigns_content.id,
            'contentId', content.id,
            'name', content.name,
            'subject', content.content,
            'sendingTime', campaigns_content."sendingTime",
            'sendToAll', campaigns_content."sendToAll"
          ) as email`),
        )
        .leftJoin('content', 'content.id', 'campaigns_content.contentId')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .where({ type: 'email', 'campaigns_content.removedAt': null })
        .as('t3'),
      't3.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('campaigns_content')
        .select(
          'campaignId',
          knex.raw(`json_build_object(
            'smsId', campaigns_content.id,
            'contentId', content.id,
            'name', content.name,
            'text', content.content,
            'sendingTime', campaigns_content."sendingTime",
            'sendToAll', campaigns_content."sendToAll"
          ) as sms`),
        )
        .leftJoin('content', 'content.id', 'campaigns_content.contentId')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .where({ type: 'sms', 'campaigns_content.removedAt': null })
        .as('t4'),
      't4.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('campaigns_content')
        .select(
          'campaignId',
          knex.raw(`json_build_object(
            'notificationId', campaigns_content.id,
            'contentId', content.id,
            'name', content.name,
            'title', content.content
          ) as notification`),
        )
        .leftJoin('content', 'content.id', 'campaigns_content.contentId')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .where({ type: 'notification', 'campaigns_content.removedAt': null })
        .as('t5'),
      't5.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('campaigns_content')
        .select(
          'campaignId',
          knex.raw(`json_build_object(
            'bannerId', campaigns_content.id,
            'contentId', content.id,
            'name', content.name,
            'location', content_type.location,
            'text', content.content
          ) as banner`),
        )
        .leftJoin('content', 'content.id', 'campaigns_content.contentId')
        .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
        .where({ type: 'banner', 'campaigns_content.removedAt': null })
        .as('t6'),
      't6.campaignId',
      'campaigns.id',
    )
    .leftJoin(
      knex('campaigns')
        .select(
          'campaign_groups.*',
          knex.raw(`array_agg(json_build_object(
            'id', campaigns.id,
            'name', campaigns.name
          ) order by campaigns.id) as campaigns`)
        )
        .leftJoin('campaign_groups', 'campaign_groups.id', 'campaigns.groupId')
        .groupBy('campaign_groups.id')
        .as('t7'),
      't7.id',
      'campaigns.groupId'
    )
    .where({ 'campaigns.id': campaignId });

  // Use proper subjects language
  campaign = campaign && {
    ...campaign,
    audience: campaign.audience && { rules: campaign.audience.rules.map(mapMinutesFrom) },
    email: campaign.email && {
      ...campaign.email,
      subject:
        campaign.email.subject.en && campaign.email.subject.en.subject
        || campaign.email.subject[config.languages[campaign.brandId][0].code].subject,
    },
    sms: campaign.sms && {
      ...campaign.sms,
      text:
        campaign.sms.text.en && campaign.sms.text.en.text
        || campaign.sms.text[config.languages[campaign.brandId][0].code].text,
    },
    notification: campaign.notification && {
      ...campaign.notification,
      title:
        campaign.notification.title.en && campaign.notification.title.en.title
        || campaign.notification.title[config.languages[campaign.brandId][0].code].title,
    },
    banner: campaign.banner && {
      ...campaign.banner,
      text:
        campaign.banner.text.en && campaign.banner.text.en.text
        || campaign.banner.text[config.languages[campaign.brandId][0].code].text,
    },
  };
  return campaign;
};

const getCsvAudience = async (knex: Knex, campaignId: Id, type?: string): Promise<string> => {
  const { audienceRules, ...campaign } = await getCampaignWithAudienceRules(knex, campaignId);

  let audience: any[];
  if (['running', 'archived'].includes(campaign.status)) {
    audience = await knex('players')
      .select(
        knex.raw('distinct on(players.id) players.*'),
        knex.raw(`json_build_object(
              'id', subscription_options.id,
              'emails', subscription_options."emails",
              'smses', subscription_options."smses",
              'snoozeEmailsUntil', subscription_options."snoozeEmailsUntil",
              'snoozeSmsesUntil', subscription_options."snoozeSmsesUntil"
            ) as "subscriptionOptions"`),
      )
      .leftJoin('campaigns_players', 'campaigns_players.playerId', 'players.id')
      .leftJoin('subscription_options', 'subscription_options.id', 'players.subscriptionOptionsId')
      .where({ campaignId, 'campaigns_players.removedAt': null })
      .groupBy('players.id')
      .groupBy('subscription_options.id');
  } else {
    const ab = new AudienceBuilder(knex, campaign);
    await ab.parseRulesArray(audienceRules);
    audience = (await ab.execute(): any);
  }

  let csvContent;
  const headers = [
    { id: 'externalId', title: 'Player ID' },
    { id: 'firstName', title: 'First name' },
    { id: 'username', title: 'Username' },
    { id: 'email', title: 'Email' },
  ];
  if (type === 'sms') {
    const [campaignSms] = await getCampaignContent(knex, campaign.id, 'sms');
    csvContent = createCSVString(
      [...headers, { id: 'mobilePhone', title: 'Mobile phone' }],
      audience.filter(elegibleForSms(campaignSms ? campaignSms.subtype : '')),
    );
  } else if (type === 'email') {
    const [campaignEmail] = await getCampaignContent(knex, campaign.id, 'email');
    csvContent = createCSVString(
      headers,
      audience.filter(elegibleForEmail(campaignEmail ? campaignEmail.subtype : '')),
    );
  } else {
    csvContent = createCSVString(headers, audience);
  }

  return csvContent;
}

const getPlayerCampaigns = (
  knex: Knex,
  externalPlayerId: Id,
): Promise<GetPlayerCampaignsResponse> =>
  knex('campaigns')
    .select('campaigns.name', 'addedAt', 'removedAt', 'emailSentAt', 'smsSentAt', 'complete')
    .leftJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .leftJoin('players', 'campaigns_players.playerId', 'players.id')
    .where({ 'players.externalId': externalPlayerId, status: 'running' })
    .andWhere((qb) =>
      qb.where({ removedAt: null }).orWhereRaw(`"removedAt" > now() - '1 day'::interval`),
    )
    .orderBy('lastSeen', 'desc');

const getPlayerCampaignsWithRewards = (
  knex: Knex,
  externalPlayerId: Id,
): Knex$QueryBuilder<PlayerCampaignsWithRewards> =>
  knex('campaigns')
    .select(
      'campaigns.name as campaignName',
      'campaigns.creditMultiple',
      'campaigns.id as campaignId',
      knex.raw(`coalesce(
        array_agg(json_build_object(
          'id', reward_rules."rewardId",
          'minDeposit', reward_rules."minDeposit",
          'maxDeposit', reward_rules."maxDeposit",
          'wager', reward_rules.wager,
          'useOnCredit', reward_rules."useOnCredit",
          'titles', reward_rules."titles",
          'quantity', reward_rules."quantity"
        )),
        '{}'
      ) as rewards`),
    )
    .leftJoin('campaigns_players', 'campaigns_players.campaignId', 'campaigns.id')
    .leftJoin('players', 'players.id', 'campaigns_players.playerId')
    .joinRaw('left join reward_rules on reward_rules."campaignId" = campaigns.id and reward_rules."removedAt" is null')
    .where({
      'campaigns_players.removedAt': null,
      'players.externalId': externalPlayerId,
      'reward_rules.trigger': 'deposit',
    })
    .modify(qb => addCampaignTimeAndStatusCheck(qb, { allowPreviewMode: true }))
    .groupBy('campaigns.id');

const getRunningCampaingsWithAudienceRules = (
  knex: Knex,
  audienceType?: AudienceType,
  brandId?: BrandId,
): Promise<CampaignWithAudienceRules[]> =>
  knex('campaigns')
    .select(
      'campaigns.*',
      knex.raw(`coalesce(
            array_agg(json_build_object(
              'id', audience_rules.id,
              'name', audience_rules.name,
              'operator', audience_rules.operator,
              'values', audience_rules.values,
              'not', audience_rules."not"
            )),
            '{}'
          ) as "audienceRules"`),
    )
    .innerJoin('audience_rules', 'audience_rules.campaignId', 'campaigns.id')
    .modify(addCampaignTimeAndStatusCheck)
    .modify(qb => (audienceType ? qb.where({ audienceType }) : qb))
    .modify(qb => (brandId ? qb.where({ brandId }) : qb))
    .groupBy('campaigns.id')
    .then((campaigns) =>
      campaigns.map(({ audienceRules, ...c }) => ({
        ...c,
        audienceRules: audienceRules.map(mapMinutesFrom),
      })),
    );

const getRewardRule = async (knex: Knex, rewardRuleId: Id): Promise<RewardRule> =>
  knex('reward_rules')
    .where({ id: rewardRuleId })
    .first();

const startCampaign = async (knex: Knex, campaignId: Id): Promise<mixed> =>
  knex.transaction(async tx => {
    const rewardRules = await getCampaignRewardRules(tx, campaignId);
    if (!rewardRules.every(r => !!r.rewardId)) {
      return Promise.reject({
        httpCode: 409,
        message: `One of the campaign rewards is empty!`,
      });
    }

    await tx('campaigns')
      .where({ id: campaignId })
      .forUpdate();

    const { audienceRules, ...campaign } = await getCampaignWithAudienceRules(tx, campaignId);

    const ab = new AudienceBuilder(tx, campaign);
    const playersQuery = (await ab.parseRulesArray(audienceRules)).getQueryBuilder();
    await connectPlayersWithCampaign(tx, playersQuery, campaignId);

    const [campaignCheck] = await tx('campaigns')
      .update({ status: 'running' }, ['*'])
      .where({ id: campaignId });
    logger.info(`Campaign ${campaignId} status has been set to 'running'`)

    // eslint-disable-next-line no-use-before-define
    await sendCorrespondence(tx, campaignId, true);
    logger.info(`Campaign ${campaignId} correspondence processed`);
    return campaignCheck;
  });

const stopCampaign = async (knex: Knex, campaignId: Id): Promise<any> =>
  knex.transaction(async tx => {
    await updateCampaign(tx, campaignId, { status: 'draft' }); // eslint-disable-line  no-use-before-define
  });

const togglePreviewMode = async (
  knex: Knex,
  // $FlowFixMe[deprecated-utility] -- probably need to edit Campaign type on Express libdef
  campaign: $Shape<Campaign>,
): Promise<Campaign> => {
  if (!campaign.previewMode) {
    const ab = new AudienceBuilder(knex, campaign, { onlyTestPlayers: true });
    await connectPlayersWithCampaign(knex, ab.getQueryBuilder(), campaign.id);
    // eslint-disable-next-line no-use-before-define
    return updateCampaign(knex, campaign.id, { previewMode: true });
  }
  // eslint-disable-next-line no-use-before-define
  return updateCampaign(knex, campaign.id, { previewMode: false });
};

const updateCampaign = async (
  knex: Knex,
  campaignId: Id,
  campaignUpdate: CampaignUpdate,
): Promise<Campaign> => {
  try {
    logger.info("Campaign update Attempt", { campaignId, campaignUpdate });

    const [campaign] = await knex('campaigns')
      .where({ id: campaignId })
      .update(campaignUpdate)
      .returning('*');

    logger.info("Campaign updated", { campaignUpdate, campaign });

    return campaign;
  } catch (e) {
    logger.error('Campaign update fail', e);
    if (e.message.includes('campaigns_name_brand_id')) {
      return Promise.reject({
        httpCode: 409,
        message: `Campaign with name "${campaignUpdate.name || ''}" already exists`,
      });
    }
    return Promise.reject({ httpCode: 400, message: `Cannot update campaign ${campaignId}` });
  }
};

const updatePlayersCampaignsMembership = async (
  pg: Knex,
  playerId?: Id,
  brandId?: BrandId,
): Promise<any> => {
  const campaigns = await getRunningCampaingsWithAudienceRules(pg, 'dynamic', brandId);
  const triggerNotificationEvent = await lazyNotificationEventTriggerProducer();
  const result = [];
  await asyncForEach(campaigns, async ({ audienceRules, ...campaign }) =>
    pg.transaction(async (knex) => {
      try {
        // Query not complete campaign members
        const allCampaignPlayers = await knex('campaigns_players')
          .select('playerId', 'id')
          .where({ campaignId: campaign.id })
          .modify((qb) => (playerId ? qb.where({ playerId }) : qb));

        const activeCampaignPlayers = await knex('campaigns_players')
          .select('playerId', 'id')
          .where({ campaignId: campaign.id, removedAt: null })
          .modify((qb) => (playerId ? qb.where({ playerId }) : qb));

        // Decide player campaign membership
        const ab = new AudienceBuilder(knex, campaign, {
          includeRemovedPlayers: true,
        });
        (await ab.parseRulesArray(audienceRules))
          .getQueryBuilder()
          .modify((qb) => (playerId ? qb.where({ 'players.id': playerId }) : qb));

        const candidatePlayers = (await ab.execute()).map(({ id, ...p }) => ({
          playerId: id,
          ...p,
        }));

        const playersToAdd = _.differenceBy(candidatePlayers, activeCampaignPlayers, 'playerId');
        const playersToRemove = _.differenceBy(activeCampaignPlayers, candidatePlayers, 'playerId');
        if (
          allCampaignPlayers.length ||
          activeCampaignPlayers.length ||
          candidatePlayers.length ||
          playersToAdd.length ||
          playersToRemove.length
        ) {
          logger.debug('Campaign', campaign.name, campaign.id, {
            playerId,
            allCampaignPlayers: allCampaignPlayers.length,
            activeCampaignPlayers: activeCampaignPlayers.length,
            candidatePlayers: candidatePlayers.length,
            playersToAdd: playersToAdd.length,
            playersToRemove: playersToRemove.length,
          });
        }

        // Add players
        if (playersToAdd.length) {
          await knex('campaigns_players').insert(
            playersToAdd.map(({ playerId: pid }) => ({ campaignId: campaign.id, playerId: pid })),
          );

          const instantRewards = await getCampaignRewardRules(knex, campaign.id, 'instant');
          if (instantRewards.length) {
            await asyncForEach(
              playersToAdd,
              async ({ playerId: pid, externalId, brandId: bid }) => {
                await creditRewardsIfFeasible(knex, {
                  externalPlayerId: externalId,
                  eventType: 'instant',
                  brandId: bid,
                  eventId: `instant-${externalId}`,
                  campaignIds: [campaign.id],
                  timestamp: new Date(),
                });
                return triggerNotificationEvent({ playerId: pid });
              },
            );
          }
        }

        // Remove players
        await asyncForEach(playersToRemove, async (p) => {
          let complete = false;
          const addedToCampaignRule = audienceRules.find((ar) => ar.name === 'addedToCampaign');
          if (
            addedToCampaignRule &&
            moment(p.addedAt).add(addedToCampaignRule.values, 'minutes') < moment()
          ) {
            complete = true;
          }
          return knex('campaigns_players')
            .where({ id: p.id, campaignId: campaign.id })
            .modify((qb) => (playerId ? qb.where({ playerId }) : qb))
            .update({ removedAt: new Date(), complete });
        });
        const res = {
          campaignId: campaign.id,
          added: playersToAdd.length,
          removed: playersToRemove.length,
        };
        result.push(res);
        if (res.added > 0 || res.removed > 0) {
          logger.debug('updatePlayersCampaignsMembership', res);
        }
      } catch (e) {
        logger.error(`Failed to update campaign membership ${campaign.id}`, JSON.stringify(e));
        throw e;
      }
    }),
  );
  return result;
};

const updateRewardRule = async (
  knex: Knex,
  rewardRuleId: Id,
  rewardRuleDraft: RewardRuleDraft,
): Promise<RewardRule> =>
  knex('reward_rules').where({ id: rewardRuleId }).update(rewardRuleDraft, ['*']);

const upsertCampaign = async (
  knex: Knex,
  campaignDraft: CampaignDraft,
  migrated: boolean = false,
): Promise<Campaign> => {
  let campaign = await knex('campaigns').where(campaignDraft).first();

  if (!campaign) {
    campaign = await upsert2(
      knex,
      'campaigns',
      campaignDraft,
      ['name', 'brandId'],
      ['audienceType', 'status', 'migrated'],
      migrated ? 'where migrated = true' : '',
    );
  }
  return campaign;
};

module.exports = {
  archiveCampaign,
  connectPlayersWithCampaign,
  createCampaign,
  createRewardRules,
  deleteRewardRule,
  duplicateCampaign,
  getCampaign,
  getCampaignPlayersForSendingCorrespondence,
  getCampaignRewardRules,
  getCampaigns,
  getCampaignStats,
  getCampaignsWithRewards,
  getCampaignWithAudienceRules,
  getCompleteCampaign,
  getCsvAudience,
  getPlayerCampaigns,
  getPlayerCampaignsWithRewards,
  getRunningCampaingsWithAudienceRules,
  getRewardRule,
  startCampaign,
  stopCampaign,
  togglePreviewMode,
  updateCampaign,
  updatePlayersCampaignsMembership,
  updateRewardRule,
  upsertCampaign,
};

// Circular dependencies...
const sendCorrespondence = require('../../jobs/sendCorrespondence');
const { createGroup } = require('../CampaignGroups/repository');
