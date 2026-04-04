// @flow
  // TODO: address this, bubbled up from bumping eslint
import type { AudienceRuleDraft, AudienceRule, Campaign } from '../../../../types/common';
import type { Player, PlayerWithSubscriptionOptions } from '../../Players/repository';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const gameClient = require('gstech-core/modules/clients/backend-games-api');
const { mergeDepositRules } = require('./utils');

const queries: { [key: string]: { column: string, additionalQuery?: string, join?: string } } = {
  campaignDeposit: { column: 'campaigns_deposits.campaignId', join: 'campaign_deposits' },
  country: { column: 'countries.code' },
  csv: { column: 'csv' }, // Here only to accept csv name (name doesn't matter in csv case
  deposit: { column: 'deposits.timestamp' },
  depositAmount: { column: 'deposits.convertedAmount' },
  totalDepositAmount: { column: 'total_deposits.amount', join: 'total_deposits' },
  email: { column: 'players.email' },
  gameManufacturer: { column: '' },
  language: { column: 'players.languageId' },
  contact: { column: 'campaigns_players.emailSentAt' },
  login: { column: 'players.lastSeen' },
  addedToCampaign: { column: 'campaigns_players.addedAt' },
  numDeposits: { column: 'players.numDeposits' },
  otherCampaignReward: { column: 'otherCampaignReward', join: 'campaign_rewards' },
  otherCampaignsMember: { column: 'campaigns_players.campaignId' },
  register: { column: 'players.createdAt' },
  segments: { column: 'players.segments' },
  tags: { column: 'players.tags' },
  landingPage: { column: 'players.registrationLandingPage' },
};

type AudienceBuilderOptions = {
  includeRemovedPlayers?: boolean,
  onlyTestPlayers?: boolean,
};

class AudienceBuilder {
  qb: Knex$QueryBuilder<any>;

  constructor(
    knex: Knex,
    campaign: Campaign,
    options: AudienceBuilderOptions = {
      includeRemovedPlayers: false,
      onlyTestPlayers: false,
    },
  ) {
    this.qb = knex('players')
      .innerJoin('countries', {
        'countries.id': 'players.countryId',
        'countries.brandId': 'players.brandId',
      })
      .modify((qb) =>
        // Return only players that are connected to campaign if migrated === true
        campaign.migrated
          ? qb.innerJoin('campaigns_players', (qb) =>
              qb
                .on('campaigns_players.playerId', 'players.id')
                .on('campaigns_players.campaignId', campaign.id),
            )
          : qb.leftJoin('campaigns_players', (qb) =>
              qb
                .on('campaigns_players.playerId', 'players.id')
                .on('campaigns_players.campaignId', campaign.id),
            ),
      )
      .leftJoin('subscription_options', 'subscription_options.id', 'players.subscriptionOptionsId')
      .select(
        knex.raw(`distinct on(players.id)
            players.id,
            players."externalId",
            players."brandId",
            players."username",
            players."email",
            players."mobilePhone",
            players."firstName",
            players."languageId",
            players."currencyId",
            players."allowEmailPromotions",
            players."allowSMSPromotions",
            players."createdAt",
            players."numDeposits",
            players."gamblingProblem",
            players."tags",
            players."segments",
            players."invalidMobilePhone",
            players."invalidEmail",
            players."registrationLandingPage",
            countries.code as "countryId",
            coalesce(json_build_object(
              'id', subscription_options.id,
              'emails', subscription_options."emails",
              'smses', subscription_options."smses",
              'snoozeEmailsUntil', subscription_options."snoozeEmailsUntil",
              'snoozeSmsesUntil', subscription_options."snoozeSmsesUntil"
            ), '{}') as "subscriptionOptions"
          `),
      )
      .whereRaw(
        'not exists (select "playerId" from campaigns_players where campaigns_players."campaignId" = ? and campaigns_players."playerId" = players.id and complete = true)',
        [campaign.id],
      )
      .whereRaw(
        "not players.tags ? array['bonusabuser', 'bonus-abuser', 'campaign-abuser', 'fail-sow']",
        [knex.raw('\\?|')],
      )
      .where({ 'countries.blocked': false, 'players.brandId': campaign.brandId })
      .modify((qb) =>
        !options.includeRemovedPlayers ? qb.where({ 'campaigns_players.removedAt': null }) : qb,
      )
      .modify((qb) => (options.onlyTestPlayers ? qb.where({ testPlayer: true }) : qb));
  }

  sign(
    key: string,
    column: string,
    operator: string,
    value: any,
    otherQb?: Knex$QueryBuilder<Player>,
  ): AudienceBuilder {
    const qb = otherQb || this.qb;
    if (
      operator === '=' &&
      ['deposit', 'contact', 'login', 'addedToCampaign', 'register'].includes(key)
    ) {
      qb.where(pg.raw(`??::date`, [column]), operator, pg.raw('?::date', [value]));
    } else {
      qb.where(column, operator, value);
    }
    return this;
  }

  between(
    column: string,
    values: any[],
    not: boolean = false, // eslint-disable-line default-param-last
    otherQb?: Knex$QueryBuilder<Player>,
  ): AudienceBuilder {
    const qb = otherQb || this.qb;
    if (not) {
      qb.whereNotBetween(column, values);
    } else {
      qb.whereBetween(column, values);
    }
    return this;
  }

  in(column: string, values: any[], not: boolean = false): AudienceBuilder {
    if ([queries.tags.column, queries.segments.column].includes(column)) {
      const valuesPlaceholders = values.map(() => '?').join(',');
      if (not) {
        this.qb.whereRaw(`not ?? ? array[${valuesPlaceholders}]::text[]`, [
          column,
          pg.raw('\\?|'),
          ...values,
        ]);
      } else {
        this.qb.whereRaw(`?? ? array[${valuesPlaceholders}]::text[]`, [
          column,
          pg.raw('\\?&'),
          ...values,
        ]);
      }
    } else if (not) {
      this.qb.whereNotIn(column, values);
    } else {
      this.qb.whereIn(column, values);
    }
    return this;
  }

  withinMinutes(
    column: string,
    value: number,
    not: boolean = false, // eslint-disable-line default-param-last
    otherQb?: Knex$QueryBuilder<Player>,
  ): AudienceBuilder {
    (otherQb || this.qb).where(
      column,
      not ? '<' : '>',
      pg.raw(`(now() - '${value} minutes'::interval)`),
    );
    return this;
  }

  csv(values: string[]): AudienceBuilder {
    // https://postgres.cz/wiki/PostgreSQL_SQL_Tricks_I#Predicate_IN_optimalization
    this.qb.andWhere((qb) => {
      if (values.length > 80) {
        const mappedValues = pg.raw(values.map((v) => `('${v.toLowerCase()}')`).join(','));
        qb.whereRaw(`? in (values ?)`, [pg.raw('lower(players.email)'), mappedValues]).orWhereRaw(
          `? in (values ?)`,
          [pg.raw('lower(players.username)'), mappedValues],
        );
      } else {
        qb.whereIn(
          pg.raw('lower(players.email)'),
          values.map((v) => v.toLowerCase()),
        ).orWhereIn(
          pg.raw('lower(players.username)'),
          values.map((v) => v.toLowerCase()),
        );
      }
    });

    return this;
  }

  otherCampaignsMember(
    {
      campaignIds,
      withinMinutes,
      complete,
      state = complete ? 'complete' : 'incomplete',
    }: {
      campaignIds: Id[],
      withinMinutes?: number,
      complete?: boolean, // Complete flag is only for backwards compatibility
      state: 'any' | 'complete' | 'incomplete' | 'expired',
    },
    not: boolean = false,
  ): AudienceBuilder {
    const { column } = queries.otherCampaignsMember;
    const otherCampaignCte = pg('campaigns_players')
      .distinct('playerId')
      .whereIn(column, campaignIds)
      .modify((qb) => {
        if (state !== 'any') {
          qb.where({ complete: state === 'complete' });
          if (state === 'incomplete') qb.where({ removedAt: null });
          else qb.whereNot({ removedAt: null });
        }
      });
    if (withinMinutes)
      this.withinMinutes(
        `${['any', 'incomplete'].includes(state) ? 'addedAt' : 'removedAt'}`,
        withinMinutes,
        undefined,
        otherCampaignCte,
      );
    this.qb
      .with('other_campaign', otherCampaignCte)
      .leftJoin('other_campaign', 'other_campaign.playerId', 'players.id')
      .modify((qb) =>
        not ? qb.whereNull('other_campaign.playerId') : qb.whereNotNull('other_campaign.playerId'),
      );
    return this;
  }

  otherCampaignReward({ campaignId, rewardId }: { campaignId: Id, rewardId: Id }): AudienceBuilder {
    this.qb.where({
      'reward_rules.campaignId': campaignId,
      'reward_rules.rewardId': rewardId,
    });

    return this;
  }

  async gameManufacturer(gameManufacturerId: string): Promise<AudienceBuilder> {
    try {
      const gm = await gameClient.getGameManufacturer(gameManufacturerId);
      if (gm && gm.blockedCountries.length) {
        this.qb.whereNotIn('countries.code', gm.blockedCountries);
      }
    } catch (e) {
      logger.warn(`Cannot query ${gameManufacturerId} game manufacturer details`, e);
    }

    return this;
  }

  async deposit(rules: AudienceRuleDraft[], not?: boolean): Promise<AudienceBuilder> {
    const qb = pg('deposits')
      .select('*')
      .where({ externalPlayerId: pg.ref('players.externalId') });
    await this.parseRulesArray(rules, qb);

    this.qb.whereRaw(`${not ? 'not ' : ''}exists ?`, [qb]);

    return this;
  }

  async parseRulesArray(
    audienceRules: AudienceRule[] | AudienceRuleDraft[],
    qb?: Knex$QueryBuilder<Player>,
  ): Promise<AudienceBuilder> {
    const joined: string[] = [];
    const modifiedAudienceRules = qb ? audienceRules : mergeDepositRules(audienceRules);

    for (const rule of modifiedAudienceRules) {
      const query = queries[rule.name] || queries[rule.operator];

      if (!query) throw new Error(`Name ${rule.name} not supported`);
      const { column, additionalQuery, join } = query;

      switch (rule.operator) {
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '!=':
        case '<>':
        case '=':
          this.sign(rule.name, column, rule.operator, rule.values, qb);
          break;
        case 'between':
          this.between(column, rule.values, rule.not, qb);
          break;
        case 'in':
          this.in(column, rule.values, rule.not);
          break;
        case 'csv':
          this.csv(rule.values);
          break;
        // Legacy support
        case 'minutesFrom':
          this.withinMinutes(column, rule.values, !rule.not, qb);
          break;
        case 'withinMinutes':
          this.withinMinutes(column, rule.values, rule.not, qb);
          break;
        case 'otherCampaignReward':
          this.otherCampaignReward(rule.values);
          break;
        case 'otherCampaignsMember':
          this.otherCampaignsMember(rule.values, rule.not);
          break;
        case 'gameManufacturer':
          await this.gameManufacturer(rule.values);
          break;
        case 'deposit':
          await this.deposit(rule.values, rule.not);
          break;
        default:
          throw new Error(`Operator ${rule.operator} not supported`);
      }
      if (join && !joined.includes(join)) {
        joined.push(join);
        if (join === 'total_deposits') {
          this.qb.leftJoin(
            pg('deposits')
              .select('externalPlayerId', pg.raw('sum("convertedAmount") as amount'))
              .groupBy('externalPlayerId')
              .as('total_deposits'),
            'players.externalId',
            'total_deposits.externalPlayerId',
          );
        }
        if (join === 'campaign_deposits') {
          this.qb.leftJoin('campaigns_deposits', {
            'campaigns_deposits.campaignId': 'campaigns_players.campaignId',
            'campaigns_players.playerId': 'players.id',
            'campaigns_deposits.playerConsent': true,
          });
        }
        if (join === 'campaign_rewards') {
          this.qb
            .leftJoin('credited_rewards', 'credited_rewards.playerId', 'players.id')
            .joinRaw(
              'left join reward_rules on reward_rules.id = credited_rewards."rewardRulesId" and reward_rules."removedAt" is null',
            );
        }
      }
      if (additionalQuery) this.qb.whereRaw(additionalQuery);
    }

    return this;
  }

  async execute(): Promise<PlayerWithSubscriptionOptions[]> {
    try {
      return await this.qb;
    } catch (e) {
      logger.error('Executing query failed', e);
      return [];
    }
  }

  getQueryBuilder(): Knex$QueryBuilder<Player> {
    return this.qb;
  }

  async getElegibleAudienceStats(contentSubtype: string = ''): Promise<{
    total: number,
    email: number,
    sms: number,
  }> {
    return await this.qb
      .clearSelect()
      .first(
        pg.raw('count(distinct players.id)::integer as total'),
        pg.raw(
          `cast(count(distinct players.id) filter (
          where "gamblingProblem" = false and
                "potentialGamblingProblem" = false and
                "invalidEmail" = false and
                "allowEmailPromotions" = true and
                (subscription_options.emails = 'all' or
                  ((:contentSubtype = 'best_offer' or :contentSubtype = 'new_and_best') and subscription_options.emails = 'best_offers') or
                  ((:contentSubtype = 'new_game' or :contentSubtype = 'new_and_best') and subscription_options.emails = 'new_games')) and
                (subscription_options."snoozeEmailsUntil" is null or subscription_options."snoozeEmailsUntil" < now())
          ) as integer) as email`,
          { contentSubtype },
        ),
        pg.raw(
          `cast(count(distinct players.id) filter (
          where "gamblingProblem" = false and
                "potentialGamblingProblem" = false and
                "invalidMobilePhone" = false and
                "allowSMSPromotions" = true and
                (subscription_options.smses = 'all' or
                  ((:contentSubtype = 'best_offer' or :contentSubtype = 'new_and_best') and subscription_options.smses = 'best_offers') or
                  ((:contentSubtype = 'new_game' or :contentSubtype = 'new_and_best') and subscription_options.smses = 'new_games')) and
                (subscription_options."snoozeSmsesUntil" is null or subscription_options."snoozeSmsesUntil" < now())
          ) as integer) as sms`,
          { contentSubtype },
        ),
      )
      .debug();
  }
}

module.exports = AudienceBuilder;
